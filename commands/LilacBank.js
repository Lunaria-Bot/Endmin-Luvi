const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const LilacBank = require('../models/LilacBank');

const ALLOWED_GUILDS = ['1421500772767498251', '1293611593845706793'];
const ALLOWED_USERS = ['861971757396787230', '912376040142307419', '723441401211256842'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lilac-bank')
    .setDescription('Manage the Lilac Bank.')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View the Lilac Bank vault.')
    )
    .addSubcommand(sub =>
      sub.setName('deposit')
        .setDescription('Deposit cores into the guild vault.')
        .addIntegerOption(opt =>
          opt.setName('wallet')
            .setDescription('Your current wallet amount')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Amount to deposit into the vault')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset the guild vault to 0 cores.')
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Permissions
    if (!ALLOWED_GUILDS.includes(guildId))
      return interaction.reply({ content: '❌ This server cannot use Lilac Bank.', ephemeral: true });

    if (!ALLOWED_USERS.includes(userId))
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // Fetch or create vault
    let bank = await LilacBank.findOne({ guildId });
    if (!bank) {
      bank = await LilacBank.create({
        guildId,
        cores: 0
      });
    }

    // -------------------------
    // VIEW
    // -------------------------
    if (sub === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('🌸 Lilac Guild Vault')
        .setColor('#d18aff')
        .addFields(
          { name: '<:LU_Core:1479467733199360060> Cores', value: `${bank.cores}`, inline: true }
        )
        .setFooter({ text: 'Lilac Bank System' });

      return interaction.reply({ embeds: [embed] });
    }

    // -------------------------
    // DEPOSIT
    // -------------------------
    if (sub === 'deposit') {
      const wallet = interaction.options.getInteger('wallet');
      const amount = interaction.options.getInteger('amount');

      if (amount <= 0)
        return interaction.reply({ content: '❌ Deposit amount must be greater than 0.', ephemeral: true });

      if (wallet < amount)
        return interaction.reply({ content: '❌ You cannot deposit more than your wallet.', ephemeral: true });

      const previousVault = bank.cores;
      const remaining = wallet - amount;

      // Update vault
      bank.cores += amount;
      await bank.save();

      const embed = new EmbedBuilder()
        .setTitle('🌸 Lilac Bank Deposit')
        .setColor('#a855f7')
        .addFields(
          {
            name: '💼 Your Wallet',
            value:
              `• Before: **${wallet} <:LU_Core:1479467733199360060>**\n` +
              `• Deposited: **${amount} <:LU_Core:1479467733199360060>**\n` +
              `• Remaining: **${remaining} <:LU_Core:1479467733199360060>**`
          },
          {
            name: '🏛️ Guild Vault',
            value:
              `• Previous Total: **${previousVault} <:LU_Core:1479467733199360060>**\n` +
              `• New Total: **${bank.cores} <:LU_Core:1479467733199360060>**`
          }
        )
        .setFooter({ text: 'Lilac Bank System' });

      return interaction.reply({ embeds: [embed] });
    }

    // -------------------------
    // RESET
    // -------------------------
    if (sub === 'reset') {
      const previous = bank.cores;

      bank.cores = 0;
      await bank.save();

      const embed = new EmbedBuilder()
        .setTitle('🌸 Lilac Bank Reset')
        .setColor('#ff4d6d')
        .addFields(
          {
            name: '🏛️ Guild Vault',
            value:
              `• Previous Total: **${previous} <:LU_Core:1479467733199360060>**\n` +
              `• New Total: **0 <:LU_Core:1479467733199360060>**`
          }
        )
        .setFooter({ text: 'Lilac Bank System' });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
