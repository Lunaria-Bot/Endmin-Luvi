const { SlashCommandBuilder } = require("discord.js");
const Afk = require("../../models/Afk");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status.")
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Why are you AFK?")
        .setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString("reason") || "AFK";

    await Afk.findOneAndUpdate(
      { userId: interaction.user.id },
      { reason, since: new Date() },
      { upsert: true }
    );

    return interaction.reply({
      content: `🟡 You are now marked as **AFK**: ${reason}`,
      ephemeral: true
    });
  }
};
