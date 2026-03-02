const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows setup instructions for Luvi Helper Bot"),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("📘 Luvi Helper Bot — Guide & Assistance")
      .setDescription("Welcome! Here’s everything you need to get started with Luvi Helper Bot.")
      .addFields(
        {
          name: "🔔 User Notification Settings",
          value:
            "`/notifications set`\n" +
            "➜ Configure your personal notification preferences (expedition, stamina refill, raid fatigue, etc.)\n\n" +
            "`/notifications view`\n" +
            "➜ View your current notification settings",
        },
        {
          name: "🛠️ View Server Settings",
          value:
            "`/view-settings`\n" +
            "➜ Display the current server configuration.",
        },
        {
          name: "❓ Need Help?",
          value:
            "If you have any questions or need assistance:\n" +
            "📌 Ping the support role: <@&1472643080908963970>\n" +
            "Our team will gladly assist you.",
        }
      )
      .setFooter({ text: "Luvi Helper Bot — Powered by Biyhung" });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    });
  },
};
