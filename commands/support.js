const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get help and join the official support server.'),

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle('🌸 Need Assistance?')
      .setColor('#a855f7')
      .setDescription(
        `If you need help, have questions, or want to report an issue, you're warmly invited to join our official support server.\n\n` +
        `Our team will be happy to assist you!`
      )
      .addFields({
        name: '🔗 Support Server',
        value: `[Click here to join](https://discord.gg/nFUNhxuNe8)`
      })
      .setFooter({ text: 'Thank you for using our services!' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
