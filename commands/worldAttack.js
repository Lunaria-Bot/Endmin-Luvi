const { EmbedBuilder } = require("discord.js");
const { setTimer } = require("../utils/timerManager");

const GUILD_ID = "1421500772767498251";
const REMINDER_CHANNEL_ID = "1479418538870571230";
const REMINDER_ROLE_ID = "1450472679021740043";

const REMINDER_MESSAGE =
  "🔔 **Daily World Attack Reminder**\n\n" +
  "Your World Attack is available.\n" +
  "Complete it before the daily reset.";

module.exports = {
  async init(client) {
    scheduleDailyReminder(client);
  },

  async handleTimer(client, timer) {
    if (timer.type !== "worldattack") return;
    await sendDailyReminder(client);
  }
};

// ---------------------------------------------------------
// DAILY REMINDER SCHEDULING (Mon → Fri)
// ---------------------------------------------------------
async function scheduleDailyReminder(client) {
  const now = new Date();
  const next = new Date();

  // Envoi à 01:00
  next.setHours(1, 0, 0, 0);

  // Si l'heure est déjà passée → demain
  if (now > next) next.setDate(next.getDate() + 1);

  // Sauter samedi (6) et dimanche (0)
  const day = next.getDay();
  if (day === 6) next.setDate(next.getDate() + 2); // samedi → lundi
  if (day === 0) next.setDate(next.getDate() + 1); // dimanche → lundi

  await setTimer(client, {
    userId: "worldattack-system",
    guildId: GUILD_ID,
    channelId: REMINDER_CHANNEL_ID,
    remindAt: next,
    type: "worldattack",
    reminderMessage: "[WorldAttack] Dispatching daily reminder..."
  });
}

// ---------------------------------------------------------
// SEND REMINDER IN CHANNEL
// ---------------------------------------------------------
async function sendDailyReminder(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const channel = guild.channels.cache.get(REMINDER_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#e67e22")
    .setTitle("Daily World Attack Reminder")
    .setDescription("Your World Attack is available.\nComplete it before the daily reset.")
    .setTimestamp();

  await channel.send({
    content: `<@&${REMINDER_ROLE_ID}>`,
    embeds: [embed]
  });

  // Replanifier pour demain
  scheduleDailyReminder(client);
}
