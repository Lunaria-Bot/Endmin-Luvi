const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { getSettings, updateSettings } = require('../utils/settingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-tier-role')
    .setDescription('Set or remove the role to ping for a boss tier')
    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription('Boss tier to set/remove role for')
        .setRequired(true)
        .addChoices(
          { name: 'Tier 1', value: 't1' },
          { name: 'Tier 2', value: 't2' },
          { name: 'Tier 3', value: 't3' }
        ))
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to ping (leave empty to remove the role)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      }

      const botOwnerId = '640517686480338948';
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
        interaction.user.id !== botOwnerId
      ) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const tier = interaction.options.getString('tier');
      const role = interaction.options.getRole('role');

      const newSettings = {};
      if (tier === 't1') newSettings.t1RoleId = role ? role.id : undefined;
      if (tier === 't2') newSettings.t2RoleId = role ? role.id : undefined;
      if (tier === 't3') newSettings.t3RoleId = role ? role.id : undefined;

      await updateSettings(interaction.guild.id, newSettings);

      if (role) {
        return interaction.editReply(`✅ Role ${role} set for ${tier.toUpperCase()} successfully!`);
      } else {
        return interaction.editReply(`✅ Role for ${tier.toUpperCase()} has been removed.`);
      }

    } catch (error) {
      console.error(`[ERROR] Failed to set tier role: ${error.message}`, error);
      try {
        return interaction.editReply('❌ An error occurred while trying to set the tier role.');
      } catch {}
    }
  }
};
