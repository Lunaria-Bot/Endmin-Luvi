const UserNotificationSettings = require('../models/UserNotificationSettings');
const { sendLog, sendError } = require('./logger');

const userSettingsCache = new Map();

async function initializeUserSettings() {
  try {
    const allUserSettings = await UserNotificationSettings.find().lean();
    for (const settings of allUserSettings) {
      userSettingsCache.set(settings.userId, settings);
    }
    await sendLog(`[INFO] Cached notification settings for ${userSettingsCache.size} users.`);
  } catch (error) {
    console.error(`[ERROR] Failed to initialize user settings cache: ${error.message}`, error);
    await sendError(`[ERROR] Failed to initialize user settings cache: ${error.message}`);
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
    await sendLog(`[INFO] User settings updated for user ${userId}`);

    return updated;
  } catch (error) {
    console.error(`[ERROR] Failed to update user settings for user ${userId}: ${error.message}`, error);
    await sendError(`[ERROR] Failed to update user settings for user ${userId}: ${error.message}`);
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
