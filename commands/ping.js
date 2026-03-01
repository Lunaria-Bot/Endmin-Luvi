const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ping = interaction.client.ws.ping;

    await interaction.editReply(`🏓 Pong! Bot latency is ${ping}ms.`);
  },
};
