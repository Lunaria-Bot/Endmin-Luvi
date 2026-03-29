const { Events } = require("discord.js");
const roleButtons = require("../config/autoroleConfig");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // Vérifie que le bouton existe
    const config = roleButtons[customId];
    if (!config) return; // ignore non-autorole buttons (stamina_, etc.)

    // Vérifie la guild
    if (!interaction.guild) {
      return interaction.reply({
        content: "❌ This button cannot be used outside a server.",
        ephemeral: true
      });
    }

    // Vérifie le membre
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member) {
      return interaction.reply({
        content: "❌ Could not find your member data.",
        ephemeral: true
      });
    }

    // Vérifie le rôle
    const role = interaction.guild.roles.cache.get(config.roleId);
    if (!role) {
      console.error(`[AUTOROLE] Role not found: ${config.roleId}`);
      return interaction.reply({
        content: "❌ This role no longer exists.",
        ephemeral: true
      });
    }

    // Ajout / retrait du rôle
    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id);
        return interaction.reply({
          content: `🟡 Role removed: **${role.name}**`,
          ephemeral: true
        });
      } else {
        await member.roles.add(role.id);
        return interaction.reply({
          content: `🟢 Role added: **${role.name}**`,
          ephemeral: true
        });
      }
    } catch (err) {
      console.error("[AUTOROLE ERROR]", err);
      return interaction.reply({
        content: "❌ Failed to update your roles.",
        ephemeral: true
      });
    }
  }
};
