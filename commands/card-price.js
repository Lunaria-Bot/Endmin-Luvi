const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("card-prices")
    .setDescription("Displays the card price reference chart"),

  async execute(interaction) {

    // Always defer to avoid Unknown Interaction
    await interaction.deferReply({ ephemeral: false });

    try {

      const embed = new EmbedBuilder()
        .setColor("#e67e22")
        .setTitle("🃏 Card Prices")
        .setDescription("Updated reference values for Luvi card trading.")
        .addFields(
          {
            name: "**Non Iconic**",
            value:
              "<:LU_Legendary:1478080802557394974> **8** <:LU_Cores:1478081091511517286>\n" +
              "<:LU_Exotic:1478080867954983003> **3** <:LU_Cores:1478081091511517286>\n" +
              "<:LU_Rare:1478080922434928794> **1** <:LU_Cores:1478081091511517286>",
            inline: false
          },
          {
            name: "**Iconics**",
            value:
              "<:LU_Legendary:1478080802557394974> **16~18** <:LU_Cores:1478081091511517286>\n" +
              "<:LU_Exotic:1478080867954983003> **8** <:LU_Cores:1478081091511517286>\n" +
              "<:LU_Rare:1478080922434928794> **2~3** <:LU_Cores:1478081091511517286>",
            inline: false
          },
          {
            name: "🌟 Grade Bonus",
            value:
              "<:LU_BGrade:1478080964423848098> `+2`   " +
              "<:LU_AGrade:1478081005951910080> `+6`   " +
              "<:LU_SGrade:1478081052303163534> `+12`",
            inline: false
          },
          {
            name: "♻️ Conversion",
            value:
              "`1.3~1.5k Essence` ↔ **1** <:LU_Cores:1478081091511517286> ↔ `150k Gold`",
            inline: false
          }
        )
        .setFooter({ text: "Endmin Luvi Helper — Powered by Alex" });

      return interaction.editReply({
        embeds: [embed]
      });

    } catch (err) {

      // SAFE ERROR HANDLING
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ An unexpected error occurred.",
            ephemeral: true
          });
        } else {
          await interaction.followUp({
            content: "❌ An unexpected error occurred.",
            ephemeral: true
          });
        }
      } catch {}

      throw err; // ton logger premium va capturer l’erreur
    }
  },
};
