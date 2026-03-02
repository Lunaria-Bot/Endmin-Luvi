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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildIntegrations,
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

// --- Load Commands (Recursive Loader) ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

function loadCommandsRecursively(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsRecursively(fullPath);
      continue;
    }

    if (!file.endsWith('.js')) continue;

    const command = require(fullPath);

    // Support for modules exporting multiple commands (like worldAttack)
    if (Array.isArray(command.data)) {
      for (const cmd of command.data) {
        client.commands.set(cmd.name, {
          data: cmd,
          execute: command.execute
        });
        console.log(`Loaded command: ${cmd.name}`);
      }
      continue;
    }

    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`Skipped loading ${file}: missing data or execute`);
    }
  }
}

loadCommandsRecursively(commandsPath);

// --- Load Events ---
const eventsPath = path.join(__dirname, 'events');
console.log("EVENTS PATH:", eventsPath);

const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
console.log("EVENT FILES FOUND:", eventFiles);

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);

  try {
    const event = require(filePath);

    if (!event.name || !event.execute) {
      console.warn(`[WARN] Event file ${file} is missing name or execute`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    console.log(`[EVENT LOADED] ${event.name} from ${file}`);
  } catch (err) {
    console.error(`[EVENT ERROR] Failed to load ${file}:`, err);
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

    // Load World Attack system
    const worldAttack = require("./commands/worldAttack");

    client.once(Events.ClientReady, async readyClient => {
      console.log(`Bot logged in as ${readyClient.user.tag}`);

      await initializeSettings();
      await initializeUserSettings();
      initTimerManager(readyClient);

      // Initialize World Attack daily reminder
      if (worldAttack.init) {
        await worldAttack.init(readyClient);
        console.log("[WorldAttack] System initialized.");
      }

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
