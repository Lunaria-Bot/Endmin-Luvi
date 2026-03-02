const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

// Fixed autorole message ID
const MESSAGE_ID = "1460243538133520510";

// Roles for each tier
const ROLE_TIER_1 = "1439616771622572225";
const ROLE_TIER_2 = "1439616926170218669";
const ROLE_TIER_3 = "1439616971908972746";

// Required roles for Tier 3
const REQUIRED_ROLES_FOR_T3 = [
  "1295761591895064577",
  "1450472679021740043",
  "1297161626910462016"
];

// Channel where the autorole message must be sent
const TARGET_CHANNEL_ID = "1460226131830509662";

// Bot ID
const BOT_ID = "1476284621133058109";

module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName("sendautorole")
      .setDescription("Send the autorole message in the configured channel.")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName("clean_autorole_reactions")
      .setDescription("Remove all user reactions from the autorole message.")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
      .setName("fix_autorole_reactions")
      .setDescription("Reset autorole reactions (1️⃣, 2️⃣, 3️⃣).")
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  ],

  async execute(interaction) {
    const { commandName, guild } = interaction;

    // -----------------------------
    // /sendautorole
    // -----------------------------
    if (commandName === "sendautorole") {
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

      return interaction.reply({
        content: `Autorole message sent in <#${TARGET_CHANNEL_ID}>.\nMessage ID is now fixed and persistent.`,
        ephemeral: true
      });
    }

    // -----------------------------
    // /clean_autorole_reactions
    // -----------------------------
    if (commandName === "clean_autorole_reactions") {
      const channel = guild.channels.cache.get(TARGET_CHANNEL_ID);
      if (!channel) {
        return interaction.reply({ content: "Autorole channel not found.", ephemeral: true });
      }

      let msg;
      try {
        msg = await channel.messages.fetch(MESSAGE_ID);
      } catch {
        return interaction.reply({ content: "Autorole message not found.", ephemeral: true });
      }

      for (const reaction of msg.reactions.cache.values()) {
        const users = await reaction.users.fetch();
        for (const user of users.values()) {
          if (user.id !== BOT_ID && !user.bot) {
            try {
              await msg.reactions.resolve(reaction.emoji.name).users.remove(user.id);
            } catch {}
          }
        }
      }

      return interaction.reply({
        content: "All user reactions have been removed.",
        ephemeral: true
      });
    }

    // -----------------------------
    // /fix_autorole_reactions
    // -----------------------------
    if (commandName === "fix_autorole_reactions") {
      const channel = guild.channels.cache.get(TARGET_CHANNEL_ID);
      if (!channel) {
        return interaction.reply({ content: "Autorole channel not found.", ephemeral: true });
      }

      let msg;
      try {
        msg = await channel.messages.fetch(MESSAGE_ID);
      } catch {
        return interaction.reply({ content: "Autorole message not found.", ephemeral: true });
      }

      // Remove all reactions
      try {
        await msg.reactions.removeAll();
      } catch {}

      // Re-add bot reactions
      for (const emoji of ["1️⃣", "2️⃣", "3️⃣"]) {
        try {
          await msg.react(emoji);
        } catch {}
      }

      return interaction.reply({
        content: "Autorole reactions have been fully reset.",
        ephemeral: true
      });
    }
  }
};
