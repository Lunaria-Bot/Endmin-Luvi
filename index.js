require("dotenv").config({
  path: process.env.NODE_ENV === "local" ? ".env.local" : ".env"
});

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  PermissionsBitField,
  ActivityType,
  Options
} = require("discord.js");

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const { initTimerManager } = require("./utils/timerManager");
const { initializeSettings } = require("./utils/settingsManager");
const { initializeUserSettings } = require("./utils/userSettingsManager");
const { logError } = require("./utils/logger"); // ✅ FIXED

const {
  processInventoryMessage,
  processInventoryReaction,
  processInventoryUpdate
} = require("./utils/inventoryProcessor");

// 🌸 GLOBAL MAINTENANCE STATE
let maintenance = false;
let maintenanceReason = null;

module.exports.getMaintenanceState = () => ({
  maintenance,
  maintenanceReason
});

module.exports.setMaintenanceState = (state, reason = null) => {
  maintenance = state;
  maintenanceReason = reason;
};

// -----------------------------
// ERROR HANDLERS
// -----------------------------
process.on("unhandledRejection", async (reason, promise) => {
  console.error("[CRITICAL] Unhandled Rejection at:", promise, "reason:", reason);

  await logError("unhandled_rejection", [
    { name: "Reason", value: String(reason) }
  ]);
});

process.on("uncaughtException", async (error) => {
  console.error("[CRITICAL] Uncaught Exception:", error);

  await logError("uncaught_exception", [
    { name: "Error", value: error.message },
    { name: "Stack", value: error.stack?.slice(0, 500) || "No stack" }
  ]);
});

// -----------------------------
// DISCORD CLIENT
// -----------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ],
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    MessageManager: 200,
    GuildMemberManager: 20,
    UserManager: 200,
    ReactionManager: 100,
    ThreadManager: 0,
    PresenceManager: 0,
    GuildScheduledEventManager: 0
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: { interval: 3600, lifetime: 1800 },
    users: { interval: 3600, filter: () => (user) => user.id !== client.user.id }
  }
});

client.inventorySessions = new Map();
client.isReady = false;
client.commandCount = 0;
client.activityStats = [];

// -----------------------------
// ACTIVITY TRACKING
// -----------------------------
function trackActivity() {
  const hour = new Date().getHours();
  const entry = client.activityStats.find((x) => x.hour === hour);
  if (entry) entry.count++;
  else client.activityStats.push({ hour, count: 1 });
  if (client.activityStats.length > 24) client.activityStats.shift();
}

// -----------------------------
// COMMAND LOADING
// -----------------------------
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

function loadCommandsRecursively(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      loadCommandsRecursively(fullPath);
      continue;
    }
    if (!file.endsWith(".js")) continue;
    const command = require(fullPath);
    if (Array.isArray(command.data)) {
      for (const cmd of command.data) {
        client.commands.set(cmd.name, { data: cmd, execute: command.execute });
        console.log(`Loaded command: ${cmd.name}`);
      }
      continue;
    }
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    }
  }
}

loadCommandsRecursively(commandsPath);

// -----------------------------
// EVENT LOADING
// -----------------------------
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  try {
    const event = require(filePath);
    if (!event.name || !event.execute) continue;
    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
    console.log(`[EVENT LOADED] ${event.name} from ${file}`);
  } catch (err) {
    console.error(`[EVENT ERROR] Failed to load ${file}:`, err);
  }
}

// -----------------------------
// MESSAGE PROCESSING
// -----------------------------
const { processMessage, processBossAndCardMessage } = require("./utils/messageProcessor");

client.on(Events.MessageCreate, async (message) => {
  trackActivity();
  await processMessage(message);
  await processBossAndCardMessage(message);
  await processInventoryMessage(message, client);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (newMessage.author.id !== "1269481871021047891") return;
  trackActivity();
  await processMessage(newMessage, oldMessage);
  await processInventoryUpdate(newMessage, client);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  await processInventoryReaction(reaction, user, client);
});

// -----------------------------
// WEBSOCKET SERVER
// -----------------------------
const startTime = Date.now();

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", () => {
  console.log("StatusBot connected to Endmin WebSocket");
});

// 🌸 HEARTBEAT EVERY 60 SECONDS
setInterval(() => {
  const payload = {
    status: "online",
    ping: client.ws.ping,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    lastRestart: startTime,
    maintenance,
    maintenanceReason
  };

  const json = JSON.stringify(payload);

  wss.clients.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(json);
    }
  });

  console.log("Heartbeat sent:", payload);
}, 60000);

// -----------------------------
// BOT READY
// -----------------------------
(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");
    if (!process.env.TOKEN) throw new Error("Missing TOKEN");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const Reminder = require("./models/Reminder");
    await Reminder.syncIndexes();

    const RaidWishlist = require("./models/RaidWishlist");
    await RaidWishlist.syncIndexes();

    const worldAttack = require("./commands/worldAttack");

    client.once(Events.ClientReady, async (readyClient) => {
      console.log(`Bot logged in as ${readyClient.user.tag}`);

      client.isReady = true;

      await initializeSettings();
      await initializeUserSettings();
      initTimerManager(readyClient);

      if (worldAttack.init) {
        await worldAttack.init(readyClient);
      }

      try {
        await client.application.commands.set([...client.commands.values()].map((c) => c.data));
      } catch (err) {
        console.log("Sync error: " + err.message);
      }

      const updateStatus = () => {
        const serverCount = readyClient.guilds.cache.size;
        readyClient.user.setActivity(`Luvi bot in ${serverCount} servers`, { type: ActivityType.Watching });
      };

      updateStatus();
      setInterval(updateStatus, 300000);
    });

    await client.login(process.env.TOKEN);
  } catch (err) {
    console.error("Failed to connect or login:", err);
    process.exit(1);
  }
})();
