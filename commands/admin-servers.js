const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const OWNER_ID = "912376040142307419";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin-servers")
    .setDescription("Owner-only server management commands")
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all servers where the bot is added")
    )
    .addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Get detailed information about a server")
        .addStringOption(option =>
          option
            .setName("server_id")
            .setDescription("The ID of the server")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("leave")
        .setDescription("Make the bot leave a server")
        .addStringOption(option =>
          option
            .setName("server_id")
            .setDescription("The ID of the server to leave")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Restrict usage to owner only
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "⛔ This command is only available to the bot owner.",
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const client = interaction.client;

    // -----------------------------
    // /admin-servers list
    // -----------------------------
    if (sub === "list") {
      const guilds = client.guilds.cache;

      const embed = new EmbedBuilder()
        .setTitle("📋 Bot Server List")
        .setColor("#d8b4fe")
        .setDescription(
          guilds.map(g => `• **${g.name}** — \`${g.id}\``).join("\n")
        )
        .setFooter({ text: `Total servers: ${guilds.size}` })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // -----------------------------
    // /admin-servers info
    // -----------------------------
    if (sub === "info") {
      const serverId = interaction.options.getString("server_id");
      const guild = client.guilds.cache.get(serverId);

      if (!guild) {
        return interaction.reply({
          content: "❌ The bot is not in this server.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📌 Server Info: ${guild.name}`)
        .setColor("#d8b4fe")
        .addFields(
          { name: "🆔 Server ID", value: guild.id, inline: true },
          { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
          { name: "👥 Members", value: `${guild.memberCount}`, inline: true },
          { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` }
        )
        .setThumbnail(guild.iconURL({ size: 1024 }))
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // -----------------------------
    // /admin-servers leave
    // -----------------------------
    if (sub === "leave") {
      const serverId = interaction.options.getString("server_id");
      const guild = client.guilds.cache.get(serverId);

      if (!guild) {
        return interaction.reply({
          content: "❌ The bot is not in this server.",
          ephemeral: true
        });
      }

      await guild.leave();

      return interaction.reply({
        content: `✅ Successfully left **${guild.name}** (\`${guild.id}\`)`,
        ephemeral: true
      });
    }
  }
};
