const UserNotificationSettings = require('../models/UserNotificationSettings');
const { logAction, logError } = require('./logger');

const userSettingsCache = new Map();

async function initializeUserSettings() {
  try {
    const allUserSettings = await UserNotificationSettings.find().lean();

    for (const settings of allUserSettings) {
      userSettingsCache.set(settings.userId, settings);
    }

    await logAction("user_settings_cache_initialized", [
      { name: "Users Cached", value: `${userSettingsCache.size}` }
    ]);

  } catch (error) {
    console.error(`[ERROR] Failed to initialize user settings cache: ${error.message}`, error);

    await logError("user_settings_cache_failed", [
      { name: "Error", value: error.message }
    ]);
  }
}

function getUserSettings(userId) {
  return userSettingsCache.get(userId) || null;
}

async function updateUserSettings(userId, newSettings) {
  try {
    const updated = await UserNotificationSettings.findOneAndUpdate(
      { userId },
      { $set: newSettings },
      { new: true, upsert: true, lean: true }
    );

    userSettingsCache.set(userId, updated);

    await logAction("user_settings_updated", [
      { name: "User", value: `<@${userId}>` },
      { name: "Updated Keys", value: Object.keys(newSettings).join(", ") || "None" }
    ]);

    return updated;

  } catch (error) {
    console.error(`[ERROR] Failed to update user settings for user ${userId}: ${error.message}`, error);

    await logError("user_settings_update_failed", [
      { name: "User", value: `<@${userId}>` },
      { name: "Error", value: error.message }
    ]);

    return null;
  }
}

function getUserSettingsCache() {
  return userSettingsCache;
}

module.exports = {
  initializeUserSettings,
  getUserSettings,
  updateUserSettings,
  getUserSettingsCache,
};
