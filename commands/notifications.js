const { SlashCommandBuilder } = require('discord.js');
const { getUserSettings, updateUserSettings } = require('../utils/userSettingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notifications')
    .setDescription('Manage your notification settings.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current notification settings.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Enable or disable a notification type.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('The notification type to configure.')
            .setRequired(true)
            .addChoices(
              { name: 'Expedition', value: 'expedition' },
              { name: 'Stamina', value: 'stamina' },
              { name: 'Raid Fatigue', value: 'raid' },
              { name: 'Raid Spawn', value: 'raid_spawn' },
              { name: 'Card Drop', value: 'card_drop' }
            ))
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable this notification.')
            .setRequired(true))
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;

      await interaction.deferReply({ ephemeral: true });

      // Default settings (sans DM)
      const defaultSettings = {
        expedition: true,
        stamina: true,
        raid: true,
        raid_spawn: true,
        card_drop: true
      };

      if (subcommand === 'view') {
        const settings = getUserSettings(userId) || defaultSettings;

        return await interaction.editReply({
          embeds: [{
            title: 'Your Notification Settings',
            color: 0x5865F2,
            fields: [
              { name: 'Expedition', value: settings.expedition ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Stamina', value: settings.stamina ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Raid Fatigue', value: settings.raid ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Raid Spawn', value: settings.raid_spawn ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Card Drop', value: settings.card_drop ? 'Enabled' : 'Disabled', inline: true }
            ]
          }]
        });
      }

      if (subcommand === 'set') {
        const type = interaction.options.getString('type');
        const enabled = interaction.options.getBoolean('enabled');

        await updateUserSettings(userId, { [type]: enabled });

        return await interaction.editReply({
          content: `Notifications for **${type}** have been **${enabled ? 'enabled' : 'disabled'}**.`
        });
      }

    } catch (error) {
      console.error(`[ERROR] /notifications failed:`, error);
      try {
        await interaction.editReply({ content: 'An error occurred while processing your request.' });
      } catch {}
    }
  },
};
