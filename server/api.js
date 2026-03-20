/**
 * server/api.js — REST API for the Endmin web panel
 * Mounted in index.js: initApi(client)
 */

const express    = require('express');
const path       = require('path');
const mongoose   = require('mongoose');
const Reminder   = require('../models/Reminder');
const Changelog  = require('../models/Changelog');
const { getCachedSettings } = require('../utils/settingsManager');

const router = express.Router();
const ADMIN_KEY = process.env.ADMIN_KEY || 'endmin-admin-secret';

// ─────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────
function adminOnly(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

// Bot status & stats
router.get('/status', (req, res) => {
  const client = req.app.locals.client;
  if (!client?.isReady) return res.json({ online: false });

  const mem = process.memoryUsage();
  res.json({
    online:       true,
    ping:         client.ws.ping,
    uptime:       Math.floor(process.uptime()),
    guilds:       client.guilds.cache.size,
    users:        client.users.cache.size,
    heapUsed:     Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal:    Math.round(mem.heapTotal / 1024 / 1024),
    rss:          Math.round(mem.rss / 1024 / 1024),
    maintenance:  req.app.locals.getMaintenanceState?.()?.maintenance || false,
    activity:     client.activityStats || [],
    commandCount: client.commandCount  || 0,
    dbState:      mongoose.connection.readyState,
  });
});

// Commands list (public)
router.get('/commands', (req, res) => {
  res.json([
    { name: 'notifications',    category: 'user',   description: 'Manage your reminder notification settings.' },
    { name: 'wishlist',         category: 'user',   description: 'Manage your raid boss wishlist. Get DM\'d when your raid spawns.' },
    { name: 'back',             category: 'user',   description: 'Mark yourself as back from AFK.' },
    { name: 'afk',              category: 'user',   description: 'Set yourself as AFK.' },
    { name: 'view-settings',    category: 'info',   description: 'View current server configuration.' },
    { name: 'help',             category: 'info',   description: 'Get help and setup instructions.' },
    { name: 'ping',             category: 'info',   description: 'Check bot latency.' },
    { name: 'card-price',       category: 'luvi',   description: 'Look up card prices.' },
    { name: 'lilac-bank',       category: 'guild',  description: 'Manage the Lilac guild vault.' },
    { name: 'world-attack',     category: 'guild',  description: 'Send world attack target to all guild members.' },
    { name: 'set-tier-role',    category: 'admin',  description: 'Configure tier roles for boss spawn pings.' },
    { name: 'autorole',         category: 'admin',  description: 'Configure automatic role assignment.' },
    { name: 'maintenance',      category: 'admin',  description: 'Toggle bot maintenance mode.' },
    { name: 'sync',             category: 'admin',  description: 'Sync slash commands.' },
    { name: 'stats',            category: 'admin',  description: 'View detailed bot statistics.' },
  ]);
});

// Published changelogs (public)
router.get('/changelogs', async (req, res) => {
  try {
    const logs = await Changelog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────

// Auth check
router.post('/admin/auth', (req, res) => {
  const { key } = req.body;
  if (key === ADMIN_KEY) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

// Active reminders
router.get('/admin/reminders', adminOnly, async (req, res) => {
  try {
    const reminders = await Reminder.find().sort({ remindAt: 1 }).lean();
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send embed to a channel
router.post('/admin/send-embed', adminOnly, async (req, res) => {
  const client = req.app.locals.client;
  const { channelId, title, description, color, fields, footer } = req.body;

  if (!channelId || !title) {
    return res.status(400).json({ error: 'channelId and title are required' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color || '#5865F2')
      .setTimestamp();

    if (description)    embed.setDescription(description);
    if (footer)         embed.setFooter({ text: footer });
    if (fields?.length) embed.addFields(fields);

    await channel.send({ embeds: [embed] });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All changelogs (admin — includes drafts)
router.get('/admin/changelogs', adminOnly, async (req, res) => {
  try {
    const logs = await Changelog.find().sort({ createdAt: -1 }).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create changelog
router.post('/admin/changelogs', adminOnly, async (req, res) => {
  try {
    const log = await Changelog.create(req.body);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update changelog
router.patch('/admin/changelogs/:id', adminOnly, async (req, res) => {
  try {
    const log = await Changelog.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish + send changelog to Discord
router.post('/admin/changelogs/:id/publish', adminOnly, async (req, res) => {
  const client = req.app.locals.client;
  const { channelId } = req.body;

  try {
    const log = await Changelog.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ error: 'Changelog not found' });

    // Send to Discord if channelId provided
    if (channelId && client) {
      const { EmbedBuilder } = require('discord.js');
      const typeEmojis = { new: '✨', fix: '🔧', improve: '⚡', remove: '🗑️' };

      const embed = new EmbedBuilder()
        .setTitle(`📋  ${log.version}  —  ${log.title}`)
        .setColor('#C8A2C8')
        .setTimestamp(new Date(log.createdAt));

      if (log.description) embed.setDescription(log.description);

      if (log.entries?.length) {
        const grouped = {};
        for (const e of log.entries) {
          if (!grouped[e.type]) grouped[e.type] = [];
          grouped[e.type].push(e.content);
        }
        for (const [type, items] of Object.entries(grouped)) {
          const emoji = typeEmojis[type] || '•';
          embed.addFields({
            name: `${emoji}  ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            value: items.map(i => `• ${i}`).join('\n'),
          });
        }
      }

      embed.setFooter({ text: 'Endmin Changelog' });

      const channel = await client.channels.fetch(channelId);
      await channel.send({ embeds: [embed] });
    }

    await Changelog.findByIdAndUpdate(req.params.id, { published: true, discordSent: !!channelId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bot settings per guild
router.get('/admin/settings', adminOnly, (req, res) => {
  const cache = getCachedSettings();
  const result = [];
  for (const [guildId, settings] of cache.entries()) {
    result.push({ guildId, ...settings });
  }
  res.json(result);
});

// ─────────────────────────────────────────────
// Init function — called from index.js
// ─────────────────────────────────────────────
function initApi(client, maintenanceFn) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.locals.client = client;
  app.locals.getMaintenanceState = maintenanceFn;

  app.use('/api', router);

  // SPA fallback
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/admin.html')));
  app.get('*',     (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

  const PORT = process.env.PANEL_PORT || 3000;
  app.listen(PORT, () => console.log(`[PANEL] Web panel running on port ${PORT}`));
}

module.exports = { initApi };
