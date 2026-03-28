const BotSettings = require('../models/BotSettings');
const { sendLog, sendError } = require('./logger');

const settingsCache = new Map();

async function initializeSettings() {
  try {
    const allSettings = await BotSettings.find().lean();
    for (const settings of allSettings) {
      settingsCache.set(settings.guildId, settings);
    }
    await sendLog(`[INFO] Cached settings for ${settingsCache.size} guilds.`);
  } catch (error) {
    console.error(`[ERROR] Failed to initialize settings cache: ${error.message}`, error);
    await sendError(`[ERROR] Failed to initialize settings cache: ${error.message}`);
  }
}

function getSettings(guildId) {
  return settingsCache.get(guildId) || null;
}

async function updateSettings(guildId, newSettings) {
  try {
    const update = {};
    const unset = {};

    for (const key in newSettings) {
      if (newSettings[key] === undefined) {
        unset[key] = 1;
      } else {
        if (!update.$set) update.$set = {};
        update.$set[key] = newSettings[key];
      }
    }

    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }

    const updated = await BotSettings.findOneAndUpdate(
      { guildId },
      update,
      { new: true, upsert: true, lean: true }
    );

    settingsCache.set(guildId, updated);
    await sendLog(`[INFO] Settings updated for guild ${guildId}`);

    return updated;
  } catch (error) {
    console.error(`[ERROR] Failed to update settings for guild ${guildId}: ${error.message}`, error);
    await sendError(`[ERROR] Failed to update settings for guild ${guildId}: ${error.message}`);
    return null;
  }
}

function getCachedSettings() {
  return settingsCache;
}

module.exports = {
  initializeSettings,
  getSettings,
  updateSettings,
  getCachedSettings,
};
