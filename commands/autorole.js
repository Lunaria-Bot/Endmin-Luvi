const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

const DATA_FILE = path.join(__dirname, "../data/autorole.json");

// Roles
const ROLE_TIER_1 = "1439616771622572225";
const ROLE_TIER_2 = "1439616926170218669";
const ROLE_TIER_3 = "1439616971908972746";

// Channel where autorole message is sent
const TARGET_CHANNEL_ID = "1477686731993120969";

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

    // Save new message ID
    const data = { messageId: msg.id };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    return interaction.reply({
      content: `Autorole message sent in <#${TARGET_CHANNEL_ID}>.\nNew message ID saved: **${msg.id}**`,
      ephemeral: true
    });
  }
};
