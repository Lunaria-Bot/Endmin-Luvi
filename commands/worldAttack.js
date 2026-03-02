const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const WorldAttackOptOut = require("../models/WorldAttackOptOut");
const { setTimer } = require("../utils/timerManager");

const GUILD_ID = "1462077488149561468";
const LOG_CHANNEL_ID = "1477686731993120969";
const ROLE_ID = "1477811655881658388";

const REMINDER_TEXT = "Hey Guild Member of Lilac, do not forget to do your world attack!";

// ---------------------------------------------------------
// REGISTER COMMANDS
// ---------------------------------------------------------
module.exports = {
  data: [
    new SlashCommandBuilder()
      .setName("toggle-worldattack")
      .setDescription("Enable or disable your daily World Attack reminder."),

    new SlashCommandBuilder()
      .setName("test-worldattack")
      .setDescription("Send a test World Attack reminder to everyone with the role.")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName("world-attack")
      .setDescription("Send a world attack target message to all role members.")
      .addStringOption(opt =>
        opt.setName("target")
          .setDescription("Target or element to focus on")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName("world-attack-users")
      .setDescription("Send a world attack reminder to a list of user IDs.")
      .addStringOption(opt =>
        opt.setName("users")
          .setDescription("Comma-separated list of user IDs")
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ],

  async execute(interaction) {
    const name = interaction.commandName;

    if (name === "toggle-worldattack") return toggleWorldAttack(interaction);
    if (name === "test-worldattack") return testWorldAttack(interaction);
    if (name === "world-attack") return worldAttack(interaction);
    if (name === "world-attack-users") return worldAttackUsers(interaction);
  },

  async init(client) {
    scheduleDailyReminder(client);
  }
};

// ---------------------------------------------------------
// /toggle-worldattack
// ---------------------------------------------------------
async function toggleWorldAttack(interaction) {
  const userId = interaction.user.id;
  const existing = await WorldAttackOptOut.findOne({ userId });

  if (existing) {
    await WorldAttackOptOut.deleteOne({ userId });
    return interaction.reply({ content: "✅ Your World Attack reminder is now enabled.", ephemeral: true });
  }

  await WorldAttackOptOut.create({ userId });
  return interaction.reply({ content: "❌ Your World Attack reminder is now disabled.", ephemeral: true });
}

// ---------------------------------------------------------
// /test-worldattack
// ---------------------------------------------------------
async function testWorldAttack(interaction) {
  const guild = interaction.guild;
  const role = guild.roles.cache.get(ROLE_ID);

  if (!role) {
    return interaction.reply({ content: `❌ Role ${ROLE_ID} not found.`, ephemeral: true });
  }

  const disabled = await WorldAttackOptOut.find().lean();
  const disabledSet = new Set(disabled.map(d => d.userId));

  let sent = 0;
  let failed = 0;

  for (const member of role.members.values()) {
    if (member.bot) continue;
    if (disabledSet.has(member.id)) continue;

    try {
      await member.send(REMINDER_TEXT);
      sent++;
    } catch {
      failed++;
    }
  }

  return interaction.reply({
    content: `📨 Test reminder sent.\n✅ Delivered: ${sent}\n❌ Failed: ${failed}`,
    ephemeral: true
  });
}

// ---------------------------------------------------------
// /world-attack target:<text>
// ---------------------------------------------------------
async function worldAttack(interaction) {
  const target = interaction.options.getString("target");
  const guild = interaction.guild;
  const role = guild.roles.cache.get(ROLE_ID);
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!role) {
    return interaction.reply({ content: `❌ Role ${ROLE_ID} not found.`, ephemeral: true });
  }

  const msg = `Hello, do please concentrate all your world attack to **${target}** Boss`;

  let sent = 0;
  const failed = [];

  for (const member of role.members.values()) {
    if (member.bot) continue;

    try {
      await member.send(msg);
      sent++;
    } catch {
      failed.push(`${member.displayName} (${member.id})`);
    }
  }

  if (logChannel) {
    await logChannel.send(`[WorldAttack] Target broadcast: **${target}**\n✅ Delivered: ${sent}\n❌ Failed: ${failed.length}`);
    if (failed.length) {
      await logChannel.send(`❌ Failed deliveries:\n${failed.join("\n")}`);
    }
  }

  return interaction.reply({
    content: `📨 Target **${target}** broadcast.\n✅ Delivered: ${sent}\n❌ Failed: ${failed.length}`,
    ephemeral: true
  });
}

// ---------------------------------------------------------
// /world-attack-users users:<IDs>
// ---------------------------------------------------------
async function worldAttackUsers(interaction) {
  const raw = interaction.options.getString("users");
  const ids = raw.split(",").map(x => x.trim());

  let sent = 0;
  const failed = [];

  for (const id of ids) {
    try {
      const user = await interaction.client.users.fetch(id);
      await user.send(REMINDER_TEXT);
      sent++;
    } catch {
      failed.push(id);
    }
  }

  return interaction.reply({
    content: `📨 Reminder sent.\n✅ Delivered: ${sent}\n❌ Failed: ${failed.length}\n${failed.join("\n")}`,
    ephemeral: true
  });
}

// ---------------------------------------------------------
// DAILY REMINDER (via setTimer)
// ---------------------------------------------------------
async function scheduleDailyReminder(client) {
  const now = new Date();
  const next = new Date();

  next.setHours(1, 0, 0, 0); // 01:00

  if (now > next) next.setDate(next.getDate() + 1);

  await setTimer(client, {
    userId: "worldattack-system",
    guildId: GUILD_ID,
    channelId: LOG_CHANNEL_ID,
    remindAt: next,
    type: "worldattack",
    reminderMessage: "[WorldAttack] Running daily reminder dispatch..."
  });
}

async function sendDailyReminder(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  const role = guild.roles.cache.get(ROLE_ID);

  if (!role) {
    if (logChannel) logChannel.send(`[WorldAttack] Role ${ROLE_ID} not found.`);
    return;
  }

  const disabled = await WorldAttackOptOut.find().lean();
  const disabledSet = new Set(disabled.map(d => d.userId));

  if (logChannel) logChannel.send("[WorldAttack] Starting reminder dispatch...");

  for (const member of role.members.values()) {
    if (member.bot) continue;
    if (disabledSet.has(member.id)) {
      if (logChannel) logChannel.send(`[WorldAttack] Skipped ${member.displayName} (opted out).`);
      continue;
    }

    try {
      await member.send(REMINDER_TEXT);
      if (logChannel) logChannel.send(`[WorldAttack] DM sent to ${member.displayName}.`);
    } catch (e) {
      if (logChannel) logChannel.send(`[WorldAttack] Failed to DM ${member.displayName}: ${e}`);
    }
  }

  if (logChannel) logChannel.send("[WorldAttack] Reminder dispatch completed.");

  // Replanifier pour demain
  scheduleDailyReminder(client);
}
