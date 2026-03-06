const Afk = require("../models/Afk");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;
    if (!message.mentions.users.size) return;

    for (const [id] of message.mentions.users) {
      const afk = await Afk.findOne({ userId: id });
      if (!afk) continue;

      const since = `<t:${Math.floor(afk.since.getTime() / 1000)}:R>`;

      message.reply({
        content: `🔕 <@${id}> is AFK — ${afk.reason} (since ${since})`,
        allowedMentions: { repliedUser: false }
      });
    }
  }
};
