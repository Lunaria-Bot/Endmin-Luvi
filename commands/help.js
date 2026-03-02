const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows setup instructions for Luvi Helper Bot"),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("📘 Luvi Helper Bot — Guide & Assistance")
      .setDescription("Bienvenue ! Voici tout ce dont tu as besoin pour utiliser Luvi Helper Bot efficacement.")
      .addFields(
        {
          name: "🔔 User Notification Settings",
          value:
            "`/notifications set`\n" +
            "➜ Configure tes notifications personnelles (expedition, stamina, raid fatigue…)\n\n" +
            "`/notifications view`\n" +
            "➜ Affiche tes paramètres actuels",
        },
        {
          name: "🛠️ View Settings",
          value:
            "`/view-settings`\n" +
            "➜ Affiche la configuration actuelle du serveur.",
        },
        {
          name: "❓ Need Help?",
          value:
            "Pour toute question ou assistance :\n" +
            "📌 Ping le rôle support : <@&1472643080908963970>\n" +
            "Notre équipe t’aidera rapidement.",
        }
      )
      .setFooter({ text: "Luvi Helper Bot — Powered by Biyhung" });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    });
  },
};
