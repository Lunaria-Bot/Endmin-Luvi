const Afk = require("../models/Afk");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    const userId = message.author.id;

    if (userId === "912376040142307419") {
      return;
    }

    const afk = await Afk.findOne({ userId });
    if (!afk) return;

    await Afk.deleteOne({ userId });

    message.reply({
      content: `🟢 Welcome back <@${userId}>! I removed your AFK status.`,
      allowedMentions: { repliedUser: false }
    });
  }
};
