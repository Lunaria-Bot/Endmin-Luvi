const Afk = require("../models/Afk");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    const afk = await Afk.findOne({ userId: message.author.id });
    if (!afk) return;

    await Afk.deleteOne({ userId: message.author.id });

    message.reply({
      content: `🟢 Welcome back <@${message.author.id}>! I removed your AFK status.`,
      allowedMentions: { repliedUser: false }
    });
  }
};
