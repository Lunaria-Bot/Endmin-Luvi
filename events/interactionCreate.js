const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Reminder = require('../models/Reminder');
const { setTimer } = require('../utils/timerManager');
const { sendLog, sendError } = require('../utils/logger');

// GLOBAL ERROR LOGGING
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {

        // LOG EVERY INTERACTION
        console.log(`[INTERACTION] ${interaction.type} | User: ${interaction.user?.id} | Command: ${interaction.commandName || interaction.customId}`);

        // DEBUG TIMEOUT: warn if no reply after 2 seconds
        setTimeout(() => {
            if (!interaction.replied && !interaction.deferred) {
                console.warn(`[WARN] Interaction ${interaction.id} (${interaction.commandName || interaction.customId}) still not replied after 2s`);
            }
        }, 2000);

        try {

            // ============================
            // SLASH COMMANDS
            // ============================
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) {
                    console.warn(`[WARN] Command not found: ${interaction.commandName}`);
                    return;
                }

                console.log(`[CMD] Running ${interaction.commandName}`);

                try {
                    await command.execute(interaction);
                    console.log(`[CMD] ${interaction.commandName} completed`);
                } catch (error) {
                    console.error(`[CMD ERROR] ${interaction.commandName}:`, error);
                    await sendError(`[CMD ERROR] ${interaction.commandName}: ${error.message}`);

                    try {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ content: 'There was an error executing this command.', ephemeral: true });
                        } else {
                            await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
                        }
                    } catch (e) {
                        if (e.code !== 10062) console.error(`[FOLLOWUP ERROR]`, e);
                    }
                }

                return;
            }

            // ============================
            // BUTTONS
            // ============================
            if (interaction.isButton()) {
                const { customId, user, channel, message } = interaction;

                console.log(`[BUTTON] ${customId} clicked by ${user.id}`);

                if (customId.startsWith('stamina_')) {
                    const mentionedUserIdMatch = message.content.match(/<@(\d+)>/);
                    const mentionedUserId = mentionedUserIdMatch ? mentionedUserIdMatch[1] : null;

                    if (mentionedUserId && user.id !== mentionedUserId) {
                        try {
                            return await interaction.reply({ content: "You can't interact with this button.", ephemeral: true });
                        } catch (err) {
                            if (err.code !== 10062) console.error(err);
                            return;
                        }
                    }

                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (err) {
                        if (err.code === 10062) {
                            console.warn(`[BUTTON] Interaction expired before defer.`);
                            return;
                        }
                        throw err;
                    }

                    const percentage = parseInt(customId.split('_')[1], 10);
                    const maxStamina = 50;
                    const staminaToRegen = (maxStamina * percentage) / 100;
                    const minutesToRegen = staminaToRegen * 2;
                    const remindAt = new Date(Date.now() + minutesToRegen * 60 * 1000);

                    try {
                        const existingReminder = await Reminder.findOne({ userId: user.id, type: 'stamina' });
                        let confirmationMessage = `You will be reminded when your stamina reaches ${percentage}%.`;

                        if (existingReminder) {
                            confirmationMessage = `Your previous stamina reminder was overwritten. You will now be reminded when your stamina reaches ${percentage}%.`;
                        }

                        await setTimer(interaction.client, {
                            userId: user.id,
                            guildId: interaction.guildId,
                            channelId: channel.id,
                            remindAt,
                            type: 'stamina',
                            reminderMessage: `<@${user.id}>, your stamina has regenerated to ${percentage}%! Time to </clash:1472170030228570113>`
                        });

                        await interaction.editReply({ content: confirmationMessage });

                        await sendLog(`[STAMINA REMINDER SET] User: ${user.id}, Percentage: ${percentage}%, Channel: ${channel.id}`);

                        const disabledRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId('stamina_25').setLabel('Remind at 25% Stamina').setStyle(ButtonStyle.Primary).setDisabled(true),
                                new ButtonBuilder().setCustomId('stamina_50').setLabel('Remind at 50% Stamina').setStyle(ButtonStyle.Primary).setDisabled(true),
                                new ButtonBuilder().setCustomId('stamina_100').setLabel('Remind at 100% Stamina').setStyle(ButtonStyle.Primary).setDisabled(true),
                            );

                        await message.edit({ components: [disabledRow] });

                    } catch (error) {
                        console.error(`[ERROR] Failed to create stamina reminder: ${error.message}`, error);
                        await sendError(`[ERROR] Failed to create stamina reminder: ${error.message}`);

                        try {
                            await interaction.editReply({ content: 'Sorry, there was an error setting your reminder.' });
                        } catch (e) {
                            if (e.code !== 10062) console.error(e);
                        }
                    }
                }

                return;
            }

        } catch (fatal) {
            console.error(`[FATAL] Unhandled error in interactionCreate:`, fatal);
            await sendError(`[FATAL] Unhandled error in interactionCreate: ${fatal.message}`);

            if (fatal.code) {
                console.error(`[DISCORD ERROR] Code: ${fatal.code}, Message: ${fatal.message}`);
            }
        }
    },
};
