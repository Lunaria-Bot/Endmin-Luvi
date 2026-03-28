const express = require("express");
const path = require("path");

module.exports = function createDashboard(client) {
  const app = express();
  const PORT = process.env.DASHBOARD_PORT || 3000;
  const TOKEN = process.env.DASHBOARD_TOKEN;

  if (!TOKEN) {
    console.warn("[Dashboard] DASHBOARD_TOKEN is not set. Dashboard will be unprotected!");
  }

  // Security middleware
  app.use((req, res, next) => {
    if (!TOKEN) return next();
    if (req.headers.authorization !== TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });

  app.use(express.json());

  /* -----------------------------
     STATS
  ----------------------------- */
  app.get("/api/stats", (req, res) => {
    res.json({
      uptime: process.uptime(),
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      commands: client.commandCount || 0,
      activity: client.activityStats || []
    });
  });

  /* -----------------------------
     LOGS
  ----------------------------- */
  app.get("/api/logs", (req, res) => {
    res.json(client._dashboardLogs?.slice(-200) || []);
  });

  /* -----------------------------
     WORLDATTACK API
  ----------------------------- */
  app.get("/api/worldattack/stats", (req, res) => {
    res.json({
      enabled: client.settings?.worldattackEnabled || false,
      channel: client.settings?.worldattackChannel || null,
      triggersToday: client.worldattack?.todayCount || 0,
      triggersGraph: client.worldattack?.graph || [],
      reminders: client.worldattack?.reminders || [],
      logs: client._dashboardLogs.filter(x => x.includes("[WorldAttack]"))
    });
  });

  app.post("/api/worldattack/toggle", (req, res) => {
    client.settings.worldattackEnabled = !client.settings.worldattackEnabled;
    res.json({ success: true });
  });

  app.post("/api/worldattack/channel", (req, res) => {
    client.settings.worldattackChannel = req.body.channel;
    res.json({ success: true });
  });

  app.post("/api/worldattack/retry", (req, res) => {
    if (client.worldattack?.retryFailed) client.worldattack.retryFailed();
    res.json({ success: true });
  });

  /* -----------------------------
     SETTINGS API
  ----------------------------- */
  app.get("/api/settings", (req, res) => {
    if (!client.settings) {
      return res.json({
        bot: { prefix: "!", language: "en" },
        worldattack: { channel: null, enabled: false },
        autorole: { tier1: null, tier2: null, tier3: null }
      });
    }

    res.json({
      bot: {
        prefix: client.settings.prefix,
        language: client.settings.language
      },
      worldattack: {
        channel: client.settings.worldattackChannel,
        enabled: client.settings.worldattackEnabled
      },
      autorole: client.settings.autorole
    });
  });

  app.post("/api/settings/update", async (req, res) => {
    const data = req.body;

    if (!client.settings) client.settings = {};

    client.settings.prefix = data.bot.prefix;
    client.settings.language = data.bot.language;

    client.settings.worldattackChannel = data.worldattack.channel;
    client.settings.worldattackEnabled = data.worldattack.enabled;

    client.settings.autorole = data.autorole;

    if (client.settings.save) await client.settings.save();

    res.json({ success: true });
  });

  /* -----------------------------
     STATIC FILES
  ----------------------------- */
  app.use(express.static(path.join(__dirname, "public")));

  /* -----------------------------
     START SERVER
  ----------------------------- */
  app.listen(PORT, () => {
    console.log(`[Dashboard] Running on port ${PORT}`);
    client.dashLog(`[Dashboard] Running on port ${PORT}`);
  });
};
