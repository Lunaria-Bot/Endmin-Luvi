const MESSAGE_ID = "1460243538133520510";
const ROLE_TIER_1 = "1439616771622572225";
const ROLE_TIER_2 = "1439616926170218669";
const ROLE_TIER_3 = "1439616971908972746";

const REQUIRED_ROLES_FOR_T3 = [
  "1295761591895064577",
  "1450472679021740043",
  "1297161626910462016"
];

const BOT_ID = "1476284621133058109";

module.exports = {
  name: "raw",
  async execute(packet, client) {
    if (!["MESSAGE_REACTION_ADD"].includes(packet.t)) return;
    if (packet.d.message_id !== MESSAGE_ID) return;

    const guild = client.guilds.cache.get(packet.d.guild_id);
    const channel = guild.channels.cache.get(packet.d.channel_id);
    const member = guild.members.cache.get(packet.d.user_id);

    if (!guild || !channel || !member) return;
    if (member.id === BOT_ID) return;

    const emoji = packet.d.emoji.name;

    const msg = await channel.messages.fetch(MESSAGE_ID);

    const removeReaction = async () => {
      try {
        await msg.reactions.resolve(emoji).users.remove(member.id);
      } catch {}
    };

    // Tier 1
    if (emoji === "1️⃣") {
      const role = guild.roles.cache.get(ROLE_TIER_1);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
      } else {
        await member.roles.add(role);
      }

      return removeReaction();
    }

    // Tier 2
    if (emoji === "2️⃣") {
      const role = guild.roles.cache.get(ROLE_TIER_2);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
      } else {
        await member.roles.add(role);
      }

      return removeReaction();
    }

    // Tier 3 (requires roles)
    if (emoji === "3️⃣") {
      const role = guild.roles.cache.get(ROLE_TIER_3);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return removeReaction();
      }

      const hasRequired = member.roles.cache.some(r => REQUIRED_ROLES_FOR_T3.includes(r.id));

      if (!hasRequired) {
        await removeReaction();
        try {
          await member.send("Keep grinding nub or join our clan to be strong");
        } catch {}
        return;
      }

      await member.roles.add(role);
      return removeReaction();
    }
  }
};
