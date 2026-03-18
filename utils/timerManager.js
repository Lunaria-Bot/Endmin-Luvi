const Reminder = require('../models/Reminder');
const { getUserSettings } = require('./userSettingsManager');
const { logAction, logError } = require('./logger');
const { getGuildChannel } = require('./messageUtils');

const timeoutMap = new Map();

// Format fields for clean text logs
function formatFields(fields) {
    return fields.map(f => `• ${f.name}: ${f.value}`).join("\n");
}

const setTimer = async (client, reminderData) => {
    try {
        if (timeoutMap.size >= 1000) {
            await logError("TimerManager Warning", [
                { name: "Active Timeouts", value: `${timeoutMap.size}` }
            ]);
        }

        const reminder = await Reminder.findOneAndUpdate(
            { userId: reminderData.userId, type: reminderData.type },
            reminderData,
            { upsert: true, new: true }
        ).lean();

        // 🔵 LOG : Reminder Started
        await logAction("reminder_start", [
            { name: "User", value: `<@${reminderData.userId}>` },
            { name: "Started at", value: new Date().toISOString() },
            { name: "End at", value: reminderData.remindAt.toISOString() },
            { name: "In", value: `<#${reminderData.channelId}>` }
        ]);

        scheduleNotification(client, reminder);
        return reminder;

    } catch (error) {
        await logError("Error Creating Timer", [
            { name: "Error", value: error.message }
        ]);
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
        await logError("Error Deleting Timer", [
            { name: "Reminder ID", value: reminderId.toString() },
            { name: "Error", value: error.message }
        ]);
    }
};

const scheduleNotification = (client, reminder) => {
    const id = reminder._id.toString();
    const remindAt = new Date(reminder.remindAt).getTime();
    const delay = remindAt - Date.now();

    if (isNaN(remindAt)) {
        logError("Invalid remindAt Timestamp", [
            { name: "Reminder ID", value: id }
        ]);
        return;
    }

    if (delay <= 0) {
        triggerNotification(client, id).catch(err => {
            logError("Immediate Trigger Failed", [
                { name: "Reminder ID", value: id },
                { name: "Error", value: err.message }
            ]);
        });
        return;
    }

    if (timeoutMap.has(id)) {
        clearTimeout(timeoutMap.get(id));
    }

    const timeoutId = setTimeout(() => {
        triggerNotification(client, id).catch(err => {
            logError("Scheduled Trigger Failed", [
                { name: "Reminder ID", value: id },
                { name: "Error", value: err.message }
            ]);
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

        if (sendReminder) {
            try {
                const channel = await getGuildChannel(client, reminder.channelId);

                // 🧹 AUTO‑CLEAN : Channel inaccessible
                if (!channel) {
                    await logError("channel_fetch_failed", [
                        { name: "Reminder ID", value: id },
                        { name: "Channel ID", value: reminder.channelId },
                        { name: "Error", value: "Missing Access or Channel Deleted" }
                    ]);

                    await Reminder.findByIdAndDelete(id);
                    return;
                }

                // Send reminder
                await channel.send(reminder.reminderMessage);

                // 🔵 LOG : Reminder Ended
                await logAction("reminder_end", [
                    { name: "User", value: `<@${reminder.userId}>` },
                    { name: "Started at", value: reminder.createdAt },
                    { name: "Ended at", value: new Date().toISOString() },
                    { name: "In", value: `<#${reminder.channelId}>` }
                ]);

            } catch (err) {
                await logError("reminder_failed", [
                    { name: "User", value: `<@${reminder.userId}>` },
                    { name: "Channel", value: `<#${reminder.channelId}>` },
                    { name: "Error", value: err.message }
                ]);
            }
        }

        await Reminder.findByIdAndDelete(id);

    } catch (error) {
        await logError("Error Triggering Notification", [
            { name: "Reminder ID", value: id },
            { name: "Error", value: error.message }
        ]);
    }
};

const initTimerManager = async (client) => {
    try {
        const pending = await Reminder.find({}).lean();

        console.log(`[TimerManager] Loaded ${pending.length} pending reminders.`);

        await logAction("TimerManager Initialized", [
            { name: "Pending Reminders", value: `${pending.length}` }
        ]);

        for (const reminder of pending) {
            scheduleNotification(client, reminder);
        }

    } catch (error) {
        await logError("Error Initializing TimerManager", [
            { name: "Error", value: error.message }
        ]);
    }
};

module.exports = {
    setTimer,
    deleteTimer,
    initTimerManager
};
