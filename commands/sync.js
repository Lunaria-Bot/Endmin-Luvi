const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Synchronize bot commands")
    .addStringOption(opt =>
      opt.setName("scope")
        .setDescription("Where to sync commands")
        .addChoices(
          { name: "Global", value: "global" },
          { name: "Guild", value: "guild" }
        )
        .setRequired(true)
    ),

  async execute() {
    // handled directly in index.js
  }
};
