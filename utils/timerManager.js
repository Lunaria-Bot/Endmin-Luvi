const Reminder = require('../models/Reminder');
const { getUserSettings } = require('./userSettingsManager');
const { sendLog, sendError } = require('./logger');
const { getGuildChannel } = require('./messageUtils');

const timeoutMap = new Map();

const setTimer = async (client, reminderData) => {
    try {
        if (timeoutMap.size >= 1000) {
            console.warn(`[WARN] TimerManager has ${timeoutMap.size} active timeouts.`);
            await sendError(`[WARN] TimerManager has ${timeoutMap.size} active timeouts.`);
        }

        const reminder = await Reminder.findOneAndUpdate(
            { userId: reminderData.userId, type: reminderData.type },
            reminderData,
            { upsert: true, new: true }
        ).lean();

        scheduleNotification(client, reminder);
        return reminder;
    } catch (error) {
        console.error('[TimerManager] Error creating timer:', error);
        await sendError(`[ERROR] [TimerManager] Error creating timer: ${error.message}`);
        throw error;
    }
};

const deleteTimer = async (reminderId) => {
    try {
        await Reminder.findByIdAndDelete(reminderId);

        const id = reminderId.toString();
        if (timeoutMap.has(id)) {
            clearTimeout(timeoutMap.get(id));
            timeoutMap.delete(id);
        }
    } catch (error) {
        console.error(`[TimerManager] Error deleting timer ${reminderId}:`, error);
        await sendError(`[ERROR] [TimerManager] Error deleting timer ${reminderId}: ${error.message}`);
    }
};

const scheduleNotification = (client, reminder) => {
    const id = reminder._id.toString();
    const remindAt = new Date(reminder.remindAt).getTime();
    const delay = remindAt - Date.now();

    if (isNaN(remindAt)) {
        console.error(`[TimerManager] Invalid remindAt for reminder ${id}`);
        return;
    }

    if (delay <= 0) {
        triggerNotification(client, id).catch(err => {
            console.error(`[TimerManager] Immediate trigger failed for ${id}:`, err);
        });
        return;
    }

    if (timeoutMap.has(id)) {
        clearTimeout(timeoutMap.get(id));
    }

    const timeoutId = setTimeout(() => {
        triggerNotification(client, id).catch(err => {
            console.error(`[TimerManager] Scheduled trigger failed for ${id}:`, err);
        });
    }, delay);

    timeoutMap.set(id, timeoutId);
};

const triggerNotification = async (client, reminderId) => {
    const id = reminderId.toString();
    timeoutMap.delete(id);

    try {
        const reminder = await Reminder.findById(id).lean();
        if (!reminder) return;

        const userSettings = getUserSettings(reminder.userId);
        const sendReminder = !userSettings || userSettings[reminder.type] !== false;
        const forceDm = reminder.type === 'raid' || (userSettings && userSettings.dmNotifications);

        if (sendReminder) {
            let sentToChannel = false;

            if (!forceDm) {
                try {
                    const channel = await getGuildChannel(client, reminder.channelId);
                    if (channel) {
                        await channel.send(reminder.reminderMessage);
                        await sendLog(`[REMINDER SENT] Type: ${reminder.type}, User: ${reminder.userId}, Channel: ${reminder.channelId}`);
                        sentToChannel = true;
                    }
                } catch (err) {
                    console.error(`[TimerManager] Failed to send to channel ${reminder.channelId}:`, err);
                }
            }

            if (forceDm || !sentToChannel) {
                try {
                    const user = await client.users.fetch(reminder.userId);
                    let msg = reminder.reminderMessage;

                    if (reminder.type !== 'raid' && reminder.guildId && reminder.channelId) {
                        msg += `\n→ https://discord.com/channels/${reminder.guildId}/${reminder.channelId}`;
                    }

                    await user.send(msg);
                    await sendLog(`[REMINDER SENT] Type: ${reminder.type}, User: ${reminder.userId} via DM`);
                } catch (err) {
                    if (err.code !== 50007) {
                        console.error(`[TimerManager] Failed to DM user ${reminder.userId}:`, err);
                        await sendError(`[ERROR] [TimerManager] Failed to DM user ${reminder.userId}: ${err.message}`);
                    }
                }
            }
        }

        await Reminder.findByIdAndDelete(id);

    } catch (error) {
        console.error(`[TimerManager] Error triggering notification for ${id}:`, error);
        await sendError(`[ERROR] [TimerManager] Error triggering notification for ${id}: ${error.message}`);
    }
};

const initTimerManager = async (client) => {
    try {
        const pending = await Reminder.find({}).lean();
        console.log(`[TimerManager] Loaded ${pending.length} pending reminders.`);

        for (const reminder of pending) {
            scheduleNotification(client, reminder);
        }
    } catch (error) {
        console.error('[TimerManager] Error initializing:', error);
        await sendError(`[ERROR] [TimerManager] Error initializing: ${error.message}`);
    }
};

module.exports = {
    setTimer,
    deleteTimer,
    initTimerManager
};
