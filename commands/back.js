const { SlashCommandBuilder } = require('discord.js');
const Afk = require('../models/Afk');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('back')
    .setDescription('Remove your AFK status (Alex only).'),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (userId !== '912376040142307419') {
      return interaction.reply({
        content: '❌ Only Alex can use this command.',
        ephemeral: true
      });
    }

    const afk = await Afk.findOne({ userId });
    if (!afk) {
      return interaction.reply({
        content: '🌙 You are not AFK.',
        ephemeral: true
      });
    }

    await Afk.deleteOne({ userId });

    return interaction.reply({
      content: '🟢 Welcome back, Alex. Your AFK status has been removed.',
      allowedMentions: { repliedUser: false }
    });
  }
};
