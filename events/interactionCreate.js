const {
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Reminder = require("../models/Reminder");
const { setTimer } = require("../utils/timerManager");
const { logAction, logError } = require("../utils/logger");

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {

        try {
            // ============================
            // SLASH COMMANDS
            // ============================
            if (interaction.isChatInputCommand()) {

                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                // 💠 LOG : Command executed
                await logAction(interaction.commandName, [
                    { name: "User", value: `<@${interaction.user.id}>` },
                    { name: "Server", value: `${interaction.guild.name} (${interaction.guild.id})` }
                ]);

                try {
                    await command.execute(interaction);

                } catch (error) {

                    // ❌ LOG : Command error
                    await logError("command_failed", [
                        { name: "Command", value: interaction.commandName },
                        { name: "User", value: `<@${interaction.user.id}>` },
                        { name: "Error", value: error.message }
                    ]);

                    // Safe reply
                    if (!interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: "❌ There was an error executing this command.",
                                ephemeral: true
                            });
                        } catch {}
                    }
                }

                return;
            }

            // ============================
            // BUTTONS
            // ============================
            if (interaction.isButton()) {
                const { customId, user, channel, message } = interaction;

                // 💠 LOG : Button click
                await logAction("button_click", [
                    { name: "Button", value: customId },
                    { name: "User", value: `<@${user.id}>` },
                    { name: "Channel", value: `<#${channel.id}>` }
                ]);

                // ----------------------------
                // STAMINA BUTTONS
                // ----------------------------
                if (customId.startsWith("stamina_")) {
                    const mentionedUserIdMatch = message.content.match(/<@(\d+)>/);
                    const mentionedUserId = mentionedUserIdMatch ? mentionedUserIdMatch[1] : null;

                    // Prevent others from clicking
                    if (mentionedUserId && user.id !== mentionedUserId) {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: "You can't interact with this button.",
                                ephemeral: true
                            });
                        }
                        return;
                    }

                    // Safe defer
                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (err) {
                        if (err.code === 10062) return; // expired
                        throw err;
                    }

                    const percentage = parseInt(customId.split("_")[1], 10);
                    const maxStamina = 50;
                    const staminaToRegen = (maxStamina * percentage) / 100;
                    const minutesToRegen = staminaToRegen * 2;
                    const remindAt = new Date(Date.now() + minutesToRegen * 60 * 1000);

                    try {
                        const existingReminder = await Reminder.findOne({
                            userId: user.id,
                            type: "stamina"
                        });

                        let confirmationMessage = `You will be reminded when your stamina reaches ${percentage}%.`;

                        if (existingReminder) {
                            confirmationMessage = `Your previous stamina reminder was overwritten.`;
                        }

                        await setTimer(client, {
                            userId: user.id,
                            guildId: interaction.guildId,
                            channelId: channel.id,
                            remindAt,
                            type: "stamina",
                            reminderMessage: `<@${user.id}>, your stamina has regenerated to ${percentage}%! Time to </clash:1472170030228570113>`
                        });

                        await interaction.editReply({ content: confirmationMessage });

                        // Disable buttons
                        const disabledRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("stamina_25")
                                .setLabel("Remind at 25%")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId("stamina_50")
                                .setLabel("Remind at 50%")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId("stamina_100")
                                .setLabel("Remind at 100%")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                        );

                        await message.edit({ components: [disabledRow] });

                    } catch (error) {

                        // ❌ LOG : Stamina reminder failed
                        await logError("stamina_reminder_failed", [
                            { name: "User", value: `<@${user.id}>` },
                            { name: "Channel", value: `<#${channel.id}>` },
                            { name: "Error", value: error.message }
                        ]);

                        try {
                            await interaction.editReply({
                                content: "Sorry, there was an error setting your reminder."
                            });
                        } catch {}
                    }
                }

                return;
            }

        } catch (fatal) {

            // ❌ LOG : Fatal interaction error
            await logError("interaction_fatal", [
                { name: "Error", value: fatal.message },
                { name: "Stack", value: fatal.stack?.slice(0, 500) || "No stack" }
            ]);
        }
    }
};
