const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

const DATA_FILE = path.join(__dirname, "../data/autorole.json");

const ROLE_TIER_1 = "1439616771622572225";
const ROLE_TIER_2 = "1439616926170218669";
const ROLE_TIER_3 = "1439616971908972746";

const TARGET_CHANNEL_ID = "1460226131830509662";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sendautorole")
    .setDescription("Send the autorole message in the configured channel.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const channel = guild.channels.cache.get(TARGET_CHANNEL_ID);

    if (!channel) {
      return interaction.reply({ content: "Channel not found.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("React to get pinged for specific tier boss spawns! 🤓")
      .setDescription(
        `**1️⃣ Ping Tier 1** — <@&${ROLE_TIER_1}>\n` +
        `**2️⃣ Ping Tier 2** — <@&${ROLE_TIER_2}>\n` +
        `**3️⃣ Ping Tier 3** — <@&${ROLE_TIER_3}>\n\n` +
        "Choose your tier notifications!"
      );

    const msg = await channel.send({ embeds: [embed] });

    await msg.react("1️⃣");
    await msg.react("2️⃣");
    await msg.react("3️⃣");

    // Ensure directory exists
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save message ID
    console.log("Saving autorole message ID:", msg.id);

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ messageId: msg.id }, null, 2));
      console.log("Saved to:", DATA_FILE);
    } catch (err) {
      console.error("Failed to write autorole.json:", err);
    }

    return interaction.reply({
      content: `Autorole message sent in <#${TARGET_CHANNEL_ID}>.\nNew message ID saved: **${msg.id}**`,
      ephemeral: true
    });
  }
};
