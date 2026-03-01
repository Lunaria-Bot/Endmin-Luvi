require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  PermissionsBitField,
  ActivityType,
  Options
} = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { initTimerManager } = require('./utils/timerManager');
const { initializeSettings } = require('./utils/settingsManager');
const { initializeUserSettings } = require('./utils/userSettingsManager');
const { sendError } = require('./utils/logger');

// --- Global Error Handling ---
process.on('unhandledRejection', async (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
  await sendError(`[CRITICAL] Unhandled Rejection: ${reason?.message || reason}`);
});

process.on('uncaughtException', async (error) => {
  console.error('[CRITICAL] Uncaught Exception:', error);
  await sendError(`[CRITICAL] Uncaught Exception: ${error.message}`);
});

// --- Client Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 200,
    GuildMemberManager: 10,
    UserManager: 100,
    ThreadManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    GuildScheduledEventManager: 0,
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 3600,
      lifetime: 1800,
    },
    users: {
      interval: 3600,
      filter: () => user => user.id !== client.user.id,
    },
  },
});

// --- Load Commands ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.warn(`Skipped loading ${file}: missing data or execute`);
  }
}

// --- Load Events ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// --- Message Processing ---
const { processMessage, processBossAndCardMessage } = require('./utils/messageProcessor');

client.on(Events.MessageCreate, async (message) => {
  await processMessage(message);
  await processBossAndCardMessage(message);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (newMessage.author.id !== '1269481871021047891') return;
  await processMessage(newMessage, oldMessage);
});

// --- Guild Join Setup ---
client.on(Events.GuildCreate, async (guild) => {
  try {
    const defaultChannel = guild.channels.cache
      .filter(ch =>
        ch.type === 0 &&
        ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)
      )
      .first();

    if (!defaultChannel) {
      console.log(`No accessible text channel found in guild ${guild.name}`);
      return;
    }

    const guideMessage = `
**Hello! Thanks for adding Luvi Helper Bot!**

To set up the bot, please use these commands:

1️⃣ Set Boss Ping Roles:
- \`/set-tier-role tier:1 role:@Role\`
- \`/set-tier-role tier:2 role:@Role\`
- \`/set-tier-role tier:3 role:@Role\`

2️⃣ View settings:
- \`/view-settings\`

3️⃣ User Notification Settings:
- \`/notifications set\`
- \`/notifications view\`
`;

    await defaultChannel.send(guideMessage);
    console.log(`Sent setup guide message in guild ${guild.name}`);
  } catch (error) {
    console.error(`Failed to send setup message in guild ${guild.name}:`, error);
  }
});

// --- MongoDB + Bot Login ---
(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
    if (!process.env.BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Reminder = require('./models/Reminder');
    await Reminder.syncIndexes().catch(err => console.error("Failed to sync Reminder indexes:", err));

    client.once(Events.ClientReady, async readyClient => {
      console.log(`Bot logged in as ${readyClient.user.tag}`);

      await initializeSettings();
      await initializeUserSettings();
      initTimerManager(readyClient);

      const updateStatus = () => {
        const serverCount = readyClient.guilds.cache.size;
        readyClient.user.setActivity(`Luvi bot in ${serverCount} servers`, { type: ActivityType.Watching });
      };

      updateStatus();
      setInterval(updateStatus, 300000);
    });

    await client.login(process.env.BOT_TOKEN);
  } catch (err) {
    console.error('Failed to connect or login:', err);
    process.exit(1);
  }
})();
