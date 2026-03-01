const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const BotSettings = require('../models/BotSettings');

const BOT_OWNER_ID = '912376040142307419';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view-settings')
    .setDescription('View current boss tier roles'),

  async execute(interaction) {
    try {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      }

      const member = interaction.member;

      const hasPermission =
        member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        interaction.user.id === BOT_OWNER_ID;

      if (!hasPermission) {
        return interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const guildId = interaction.guild.id;
      const settings = await BotSettings.findOne({ guildId }).lean();

      if (!settings) {
        return interaction.editReply({
          content: '⚠️ No settings found for this server.',
        });
      }

      const t1 = settings.t1RoleId ? `<@&${settings.t1RoleId}>` : '❌ Not set';
      const t2 = settings.t2RoleId ? `<@&${settings.t2RoleId}>` : '❌ Not set';
      const t3 = settings.t3RoleId ? `<@&${settings.t3RoleId}>` : '❌ Not set';

      const embed = {
        color: 0x00bcd4,
        title: '📊 Current Boss Tier Role Settings',
        description: [
          `**Tier 3 Role:** ${t3}`,
          `**Tier 2 Role:** ${t2}`,
          `**Tier 1 Role:** ${t1}`
        ].join('\n'),
        footer: { text: 'Luvi Helper Settings' }
      };

      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error(`[ERROR] Failed to view settings: ${error.message}`, error);
      try {
        return interaction.editReply({ content: '❌ An error occurred while trying to view settings.' });
      } catch {}
    }
  },
};
