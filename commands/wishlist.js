const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RaidWishlist = require('../models/RaidWishlist');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalize(name) {
  return name.trim().toLowerCase();
}

function raidEmbed(color, title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: 'Raid Wishlist • Endmin' });

  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);

  return embed;
}

// ─────────────────────────────────────────────
// Command
// ─────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wishlist')
    .setDescription('Manage your raid wishlist.')

    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a raid boss to your wishlist.')
        .addStringOption(opt =>
          opt.setName('raid')
            .setDescription('Name of the raid boss (e.g. Kim Dokja, Rimuru…)')
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a raid boss from your wishlist.')
        .addStringOption(opt =>
          opt.setName('raid')
            .setDescription('Name of the raid boss to remove.')
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View your current raid wishlist.')
    )

    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Clear your entire raid wishlist.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    try {

      // ──────────────────────────────────────
      // ADD
      // ──────────────────────────────────────
      if (sub === 'add') {
        const raw      = interaction.options.getString('raid');
        const raidName = normalize(raw);

        const existing = await RaidWishlist.findOne({ userId, raidName });
        if (existing) {
          return interaction.editReply({
            embeds: [raidEmbed(
              '#FEE75C',
              '⚠️  Already on your wishlist',
              `**${raw}** is already in your wishlist.`
            )]
          });
        }

        const count = await RaidWishlist.countDocuments({ userId });
        if (count >= 25) {
          return interaction.editReply({
            embeds: [raidEmbed(
              '#ED4245',
              '❌  Wishlist full',
              'You can have a maximum of **25 raids** in your wishlist.\nRemove one first with `/wishlist remove`.'
            )]
          });
        }

        await RaidWishlist.create({ userId, raidName });

        return interaction.editReply({
          embeds: [raidEmbed(
            '#57F287',
            '✅  Added to wishlist',
            `**${raw}** has been added to your raid wishlist.\nYou'll receive a DM whenever this raid spawns!`
          )]
        });
      }

      // ──────────────────────────────────────
      // REMOVE
      // ──────────────────────────────────────
      if (sub === 'remove') {
        const raw      = interaction.options.getString('raid');
        const raidName = normalize(raw);

        const deleted = await RaidWishlist.findOneAndDelete({ userId, raidName });
        if (!deleted) {
          return interaction.editReply({
            embeds: [raidEmbed(
              '#FEE75C',
              '⚠️  Not found',
              `**${raw}** is not in your wishlist.`
            )]
          });
        }

        return interaction.editReply({
          embeds: [raidEmbed(
            '#57F287',
            '✅  Removed from wishlist',
            `**${raw}** has been removed from your raid wishlist.`
          )]
        });
      }

      // ──────────────────────────────────────
      // VIEW
      // ──────────────────────────────────────
      if (sub === 'view') {
        const entries = await RaidWishlist.find({ userId }).sort({ raidName: 1 }).lean();

        if (!entries.length) {
          return interaction.editReply({
            embeds: [raidEmbed(
              '#5865F2',
              '📋  Your Raid Wishlist',
              'Your wishlist is empty.\nUse `/wishlist add` to start tracking raid bosses!'
            )]
          });
        }

        const list = entries
          .map((e, i) => `\`${String(i + 1).padStart(2, '0')}\`  ${e.raidName}`)
          .join('\n');

        return interaction.editReply({
          embeds: [raidEmbed(
            '#C8A2C8',
            '📋  Your Raid Wishlist',
            list,
            [{ name: 'Total', value: `${entries.length} / 25 raids`, inline: true }]
          )]
        });
      }

      // ──────────────────────────────────────
      // CLEAR
      // ──────────────────────────────────────
      if (sub === 'clear') {
        const { deletedCount } = await RaidWishlist.deleteMany({ userId });

        if (!deletedCount) {
          return interaction.editReply({
            embeds: [raidEmbed(
              '#FEE75C',
              '⚠️  Nothing to clear',
              'Your wishlist is already empty.'
            )]
          });
        }

        return interaction.editReply({
          embeds: [raidEmbed(
            '#57F287',
            '🧹  Wishlist cleared',
            `Removed **${deletedCount}** raid(s) from your wishlist.`
          )]
        });
      }

    } catch (err) {
      console.error('[ERROR] /wishlist failed:', err);
      try {
        await interaction.editReply({
          embeds: [raidEmbed(
            '#ED4245',
            '❌  Unexpected error',
            'Something went wrong. Please try again later.'
          )]
        });
      } catch {}
    }
  }
};
