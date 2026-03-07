const Reminder = require('../models/Reminder');
const { getUserSettings } = require('./userSettingsManager');
const { sendLog, sendError } = require('./logger');
const { getGuildChannel } = require('./messageUtils');

const timeoutMap = new Map();

// Convert embed-like structure to clean text for your logger
function formatFields(fields) {
    return fields.map(f => `• **${f.name}:** ${f.value}`).join("\n");
}

async function sendErrorEmbed(title, fields = []) {
    const text =
        `❌ **${title}**\n` +
        `${formatFields(fields)}\n` +
        `⏱️ ${new Date().toISOString()}`;

    await sendError(text);
}

async function sendLogEmbed(title, fields = []) {
    const text =
        `📘 **${title}**\n` +
        `${formatFields(fields)}\n` +
        `⏱️ ${new Date().toISOString()}`;

    await sendLog(text);
}

const setTimer = async (client, reminderData) => {
    try {
        if (timeoutMap.size >= 1000) {
            await sendErrorEmbed("TimerManager Warning", [
                { name: "Active Timeouts", value: `${timeoutMap.size}` }
            ]);
        }

        const reminder = await Reminder.findOneAndUpdate(
            { userId: reminderData.userId, type: reminderData.type },
            reminderData,
            { upsert: true, new: true }
        ).lean();

        scheduleNotification(client, reminder);
        return reminder;

    } catch (error) {
        await sendErrorEmbed("Error Creating Timer", [
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
        await sendErrorEmbed("Error Deleting Timer", [
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
        sendErrorEmbed("Invalid remindAt Timestamp", [
            { name: "Reminder ID", value: id }
        ]);
        return;
    }

    if (delay <= 0) {
        triggerNotification(client, id).catch(err => {
            sendErrorEmbed("Immediate Trigger Failed", [
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
            sendErrorEmbed("Scheduled Trigger Failed", [
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

                if (channel) {
                    await channel.send(reminder.reminderMessage);

                    await sendLogEmbed("Reminder Sent", [
                        { name: "Type", value: reminder.type },
                        { name: "User", value: `<@${reminder.userId}>` },
                        { name: "Channel", value: `<#${reminder.channelId}>` }
                    ]);

                } else {
                    await sendErrorEmbed("Channel Not Found", [
                        { name: "Reminder ID", value: id },
                        { name: "Channel ID", value: reminder.channelId }
                    ]);
                }

            } catch (err) {
                await sendErrorEmbed("Failed to Send Reminder", [
                    { name: "Channel ID", value: reminder.channelId },
                    { name: "Error", value: err.message }
                ]);
            }
        }

        await Reminder.findByIdAndDelete(id);

    } catch (error) {
        await sendErrorEmbed("Error Triggering Notification", [
            { name: "Reminder ID", value: id },
            { name: "Error", value: error.message }
        ]);
    }
};

const initTimerManager = async (client) => {
    try {
        const pending = await Reminder.find({}).lean();

        await sendLogEmbed("TimerManager Initialized", [
            { name: "Pending Reminders", value: `${pending.length}` }
        ]);

        for (const reminder of pending) {
            scheduleNotification(client, reminder);
        }

    } catch (error) {
        await sendErrorEmbed("Error Initializing TimerManager", [
            { name: "Error", value: error.message }
        ]);
    }
};

module.exports = {
    setTimer,
    deleteTimer,
    initTimerManager
};
