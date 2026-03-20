const { SlashCommandBuilder } = require("discord.js");
const endmin = require("../index.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("maintenance")
    .setDescription("Manage Endmin maintenance mode")
    .addSubcommand(sub =>
      sub.setName("enable")
        .setDescription("Enable maintenance mode")
        .addStringOption(opt =>
          opt.setName("reason")
            .setDescription("Reason for maintenance")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName("disable")
        .setDescription("Disable maintenance mode")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "enable") {
      const reason = interaction.options.getString("reason") || "No reason provided.";
      endmin.setMaintenanceState(true, reason);

      return interaction.reply({
        content: `🟡 Maintenance mode enabled.\nReason: **${reason}**`,
        ephemeral: true
      });
    }

    if (sub === "disable") {
      endmin.setMaintenanceState(false, null);

      return interaction.reply({
        content: "🟢 Maintenance mode disabled.",
        ephemeral: true
      });
    }
  }
};
