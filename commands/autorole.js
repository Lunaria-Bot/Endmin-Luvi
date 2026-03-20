const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const ROLE_TIER_1 = "1439616771622572225";
const ROLE_TIER_2 = "1439616926170218669";
const ROLE_TIER_3 = "1439616971908972746";

const TARGET_CHANNEL_ID = "1460226131830509662";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sendautorole")
    .setDescription("Send the autorole button panel.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const channel = interaction.guild.channels.cache.get(TARGET_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({ content: "Channel not found.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("Choose your tier notifications 🤓")
      .setDescription(
        `**Tier 1** — <@&${ROLE_TIER_1}>\n` +
        `**Tier 2** — <@&${ROLE_TIER_2}>\n` +
        `**Tier 3** — <@&${ROLE_TIER_3}>\n\n` +
        "Click a button to toggle your role."
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tier1")
        .setLabel("Tier 1")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("tier2")
        .setLabel("Tier 2")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("tier3")
        .setLabel("Tier 3")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      content: `Autorole panel sent in <#${TARGET_CHANNEL_ID}>.`,
      ephemeral: true
    });
  }
};
