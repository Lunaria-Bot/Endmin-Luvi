const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ─────────────────────────────────────────────
// Only this user can use this command
// ─────────────────────────────────────────────
const OWNER_ID = '912376040142307419';

// In-memory toggle (resets on bot restart — that's fine for testing)
let testModeEnabled = false;

module.exports = {
  testModeEnabled: () => testModeEnabled,

  data: new SlashCommandBuilder()
    .setName('test-raid-spawn')
    .setDescription('[DEV] Toggle raid spawn DM test mode for the owner.'),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ This command is reserved for the bot owner.',
        ephemeral: true,
      });
    }

    testModeEnabled = !testModeEnabled;

    const embed = new EmbedBuilder()
      .setTitle(testModeEnabled ? '🟢  Test mode enabled' : '🔴  Test mode disabled')
      .setColor(testModeEnabled ? '#57F287' : '#ED4245')
      .setDescription(
        testModeEnabled
          ? `You will now receive a DM **every time** a raid spawns, regardless of your wishlist.\n\nUse \`/test-raid-spawn\` again to disable.`
          : `You will no longer receive test DMs on raid spawns.`
      )
      .setFooter({ text: 'Raid Spawn Test Mode • Endmin Dev' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
