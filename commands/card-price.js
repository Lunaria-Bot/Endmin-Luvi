const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("card-prices")
    .setDescription("Displays the card price reference chart"),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor("#e67e22")
      .setTitle("🃏 Card Prices")
      .setDescription("Updated reference values for Luvi card trading.")
      .addFields(
        {
          name: "## Non Iconic",
          value:
            "<:LU_Legendary:1439751446634565755> **8** <:LU_Cores:1439750755518124042>\n" +
            "<:LU_Exotic:1439751469518684234> **3** <:LU_Cores:1439750755518124042>\n" +
            "<:LU_Rare:1439751495116521642> **1**",
          inline: false
        },
        {
          name: "## Iconics",
          value:
            "<:LU_Legendary:1439751446634565755> **16~18** <:LU_Cores:1439750755518124042>\n" +
            "<:LU_Exotic:1439751469518684234> **8**\n" +
            "<:LU_Rare:1439751495116521642> **2~3** <:LU_Cores:1439750755518124042>",
          inline: false
        },
        {
          name: "🌟 Grade Bonus",
          value:
            "<:LU_BGrade:1439750983474348062> `+2`   " +
            "<:LU_AGrade:1439751071680434186> `+6`   " +
            "<:LU_SGrade:1439750954919657624> `+12`",
          inline: false
        },
        {
          name: "♻️ Conversion",
          value:
            "`1.3~1.5k Essence` ↔ **1** <:LU_Cores:1439750755518124042> ↔ `150k Gold`",
          inline: false
        }
      )
      .setFooter({ text: "Luvi Helper Bot — Powered by Biyhung" });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    });
  },
};
