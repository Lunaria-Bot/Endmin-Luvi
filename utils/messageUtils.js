const { DiscordAPIError } = require('discord.js');
const { logError } = require('./logger');

/**
 * Fetches a guild text channel and verifies permissions.
 * @param {import('discord.js').Client} client 
 * @param {string} channelId 
 * @returns {Promise<import('discord.js').BaseGuildTextChannel | null>}
 */
const getGuildChannel = async (client, channelId) => {
    try {
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
            await logError("channel_invalid", [
                { name: "Channel ID", value: channelId },
                { name: "Reason", value: "Not a valid text channel" }
            ]);
            return null;
        }

        return channel;

    } catch (error) {
        if (error.code === 10003) { // Unknown Channel
            await logError("channel_not_found", [
                { name: "Channel ID", value: channelId }
            ]);
            return null;
        }

        await logError("channel_fetch_failed", [
            { name: "Channel ID", value: channelId },
            { name: "Error", value: error.message }
        ]);

        throw error;
    }
};

/**
 * Replies to a message safely, handling deleted messages and auto-deletion.
 * @param {import('discord.js').Message} message 
 * @param {string|import('discord.js').MessagePayload|import('discord.js').MessageReplyOptions} content 
 * @param {boolean} [autoDelete=false] 
 * @returns {Promise<void>}
 */
const reply = async (message, content, autoDelete = false) => {
    let msg = null;

    try {
        msg = await message.reply(content);

    } catch (error) {
        if (error instanceof DiscordAPIError) {
            if (error.code === 50035 || error.code === 10008) {
                await logError("reply_failed", [
                    { name: "Message ID", value: message.id },
                    { name: "Channel ID", value: message.channelId },
                    { name: "Reason", value: "Message deleted or invalid" }
                ]);
                return;
            }
        }

        await logError("reply_unexpected_error", [
            { name: "Message ID", value: message.id },
            { name: "Channel ID", value: message.channelId },
            { name: "Error", value: error.message }
        ]);

        throw error;
    }

    if (autoDelete && msg) {
        setTimeout(async () => {
            try {
                await msg.delete();
            } catch (error) {
                if (error.code !== 10008) {
                    await logError("autodelete_failed", [
                        { name: "Message ID", value: msg.id },
                        { name: "Channel ID", value: msg.channelId },
                        { name: "Error", value: error.message }
                    ]);
                }
            }
        }, 15000);
    }
};

module.exports = { getGuildChannel, reply };
