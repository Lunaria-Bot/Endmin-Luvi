const {
  parseBossEmbed,
  parseBossComponent,
  parseExpeditionEmbed,
  parseExpeditionComponent,
  parseRaidViewEmbed,
  parseRaidViewComponent,
} = require('./embedParser');

const { getSettings } = require('./settingsManager');
const Reminder = require('../models/Reminder');
const { sendError } = require('./logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { setTimer } = require('./timerManager');

const LUVI_ID = '1269481871021047891';

async function processMessage(message, oldMessage = null) {
  if (!message.guild || message.author.id !== LUVI_ID) return;
  if (Date.now() - message.createdTimestamp > 60000) return;

  try {
    // === STAMINA DETECTION ===
    if (message.content.includes("you don't have enough stamina!")) {
      let userId = null;

      if (message.interaction?.user?.id) {
        userId = message.interaction.user.id;
      } else if (message.mentions.users.size > 0) {
        userId = message.mentions.users.first().id;
      } else if (message.reference) {
        try {
          const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
          userId = referencedMessage.author.id;
        } catch (error) {
          console.error('Error fetching referenced message:', error);
        }
      }

      if (userId) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('stamina_25').setLabel('Remind at 25% Stamina').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('stamina_50').setLabel('Remind at 50% Stamina').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('stamina_100').setLabel('Remind at 100% Stamina').setStyle(ButtonStyle.Primary)
        );

        try {
          await message.channel.send({
            content: `<@${userId}>, I see you've run out of stamina. When would you like to be reminded?`,
            components: [row],
          });
        } catch (err) {
          if (err.code === 50013 || err.code === 50001) {
            console.warn(`[WARN] Missing permissions to send stamina message in channel ${message.channel.id}`);
          } else {
            console.error(`[ERROR] Failed to send stamina message: ${err.message}`, err);
            await sendError(`[ERROR] Failed to send stamina message: ${err.message}`);
          }
        }
      }
    }

    // === EMBEDS / COMPONENTS ===
    const embed = message.embeds[0];
    const components = message.components;

    // RAID FATIGUE
    const raidInfo = embed ? parseRaidViewEmbed(embed) : parseRaidViewComponent(components);
    if (raidInfo) {
      // Identify who triggered this raid message
      let triggerId = null;
      let triggerDisplayName = null;
      let triggerUsername = null;

      if (message.interaction?.user) {
        // Slash command: /raid view
        triggerId = message.interaction.user.id;
        triggerDisplayName = message.interaction.member?.displayName ?? message.interaction.user.displayName ?? null;
        triggerUsername = message.interaction.user.username ?? null;
      } else if (message.reference?.messageId) {
        // Text command: @Luvi raid — fetch the original message to get the author
        try {
          const refMsg = await message.channel.messages.fetch(message.reference.messageId);
          triggerId = refMsg.author.id;
          triggerDisplayName = refMsg.member?.displayName ?? refMsg.author.displayName ?? null;
          triggerUsername = refMsg.author.username ?? null;
        } catch {
          // silently skip if we can't resolve the trigger
        }
      }

      if (!triggerId) {
        console.log('[RAID] Could not identify trigger user, skipping raid fatigue reminder');
      } else {
        console.log(`[RAID] Trigger: id=${triggerId} displayName="${triggerDisplayName}" username="${triggerUsername}"`);
        console.log(`[RAID] Fatigued entries:`, raidInfo.map(e => `name="${e.displayName}"`).join(', '));

        // Find if the trigger user appears as fatigued in the party list
        const myEntry = raidInfo.find(entry => {
          // Match by Discord ID if available
          if (entry.userId && entry.userId === triggerId) return true;
          // Match by display name or username (case-insensitive)
          if (entry.displayName) {
            const dn = entry.displayName.toLowerCase();
            if (triggerDisplayName && dn === triggerDisplayName.toLowerCase()) return true;
            if (triggerUsername && dn === triggerUsername.toLowerCase()) return true;
          }
          return false;
        });

        if (!myEntry) {
          console.log(`[RAID] Trigger user not found in fatigued list, skipping`);
        } else {
          console.log(`[RAID] Match found! fatigueMillis=${myEntry.fatigueMillis}`);

          const remindAt = new Date(Date.now() + myEntry.fatigueMillis);

          const existingReminder = await Reminder.findOne({
            userId: triggerId,
            type: 'raid',
            remindAt: {
              $gte: new Date(remindAt.getTime() - 5000),
              $lte: new Date(remindAt.getTime() + 5000),
            },
          });

          if (!existingReminder) {
            try {
              await setTimer(message.client, {
                userId: triggerId,
                channelId: message.channel.id,
                remindAt,
                type: 'raid',
                reminderMessage: `<@${triggerId}>, your raid fatigue has worn off! You can attack the boss again`,
              });
              console.log(`[RAID] Reminder set for ${triggerId} at ${remindAt}`);
            } catch (error) {
              if (error.code !== 11000) {
                console.error(`[ERROR] Failed to create reminder for raid fatigue: ${error.message}`, error);
                await sendError(`[ERROR] Failed to create reminder for raid fatigue: ${error.message}`);
              }
            }
          } else {
            console.log(`[RAID] Reminder already exists, skipping`);
          }
        }
      }

    // EXPEDITION RESEND
    const isResendFromEmbed = embed?.title?.endsWith("Expedition Resend Results");
    const expInfoFromComp = parseExpeditionComponent(components);
    const isResendFromComp = expInfoFromComp?.isResend;

    if (isResendFromEmbed || isResendFromComp) {
      let userId = message.interaction?.user?.id;

      if (!userId && message.reference?.messageId) {
        try {
          const refMessage = await message.fetchReference();
          userId = refMessage.interaction?.user?.id;

          if (!userId) {
            const refEmbed = refMessage.embeds[0];
            const refComponents = refMessage.components;
            const refExpInfo = refEmbed ? parseExpeditionEmbed(refEmbed) : parseExpeditionComponent(refComponents);

            if (refExpInfo?.username) {
              const members = await message.guild.members.fetch({ query: refExpInfo.username, limit: 1 });
              const member = members.first();
              if (member) userId = member.id;
            }
          }
        } catch (err) {
          console.warn("[WARN] Failed to fetch referenced message:", err.message);
        }
      }

      if (userId) {
        try {
          await setTimer(message.client, {
            userId,
            guildId: message.guild.id,
            channelId: message.channel.id,
            remindAt: new Date(Date.now() + 7200000),
            type: 'expedition',
            reminderMessage: `<@${userId}>, your </expeditions:1472170030337626153> cards are ready to be claimed!`,
          });
        } catch (err) {
          console.error(`[ERROR] Failed to set timer for expedition claim: ${err.message}`, err);
          await sendError(`[ERROR] Failed to set timer for expedition claim: ${err.message}`);
        }
      }
    }

    // EXPEDITION NORMAL
    const expeditionInfo = embed ? parseExpeditionEmbed(embed) : expInfoFromComp;
    if (expeditionInfo && !expeditionInfo.isResend) {
      let userId = message.interaction?.user?.id;

      if (!userId && expeditionInfo.username) {
        try {
          const members = await message.guild.members.fetch({ query: expeditionInfo.username, limit: 1 });
          const member = members.first();
          if (member) userId = member.id;
        } catch (err) {
          console.error(`[ERROR] Failed to fetch member for username: ${expeditionInfo.username}`, err);
          await sendError(`[ERROR] Failed to fetch member for username: ${expeditionInfo.username}`);
        }
      }

      if (userId) {
        const maxCard = expeditionInfo.cards.reduce((a, b) => (a.remainingMillis > b.remainingMillis ? a : b));

        if (maxCard) {
          try {
            const remindAt = new Date(Date.now() + maxCard.remainingMillis);

            const existingReminder = await Reminder.findOne({ userId, type: 'expedition' });

            if (!existingReminder || Math.abs(existingReminder.remindAt - remindAt) >= 60000) {
              await setTimer(message.client, {
                userId,
                cardId: maxCard.cardId,
                guildId: message.guild.id,
                channelId: message.channel.id,
                remindAt,
                type: 'expedition',
                reminderMessage: `<@${userId}>, your </expeditions:1472170030337626153> cards are ready to be claimed!`,
              });
            }
          } catch (error) {
            console.error(`[ERROR] Failed to create reminder for expedition: ${error.message}`, error);
            await sendError(`[ERROR] Failed to create reminder for expedition: ${error.message}`);
          }
        }
      }
    }

    // RAID SPAWN
    const title = (embed?.title || "").toLowerCase();
    const description = (embed?.description || "").toLowerCase();

    if (title.includes("raid spawned") || description.includes("raid spawned")) {
      let userId = message.interaction?.user?.id;

      if (!userId) {
        try {
          const messages = await message.channel.messages.fetch({ limit: 20 });
          const spawnMsg = messages.find(m =>
            !m.author.bot &&
            /\braid\s+spawn\b/i.test(m.content) &&
            Date.now() - m.createdTimestamp < 20000
          );
          if (spawnMsg) userId = spawnMsg.author.id;
        } catch (err) {
          console.error("Failed to fetch messages for raid spawn check:", err);
          await sendError(`[ERROR] Failed to fetch messages for raid spawn check: ${err.message}`);
        }
      }

      if (userId) {
        try {
          await setTimer(message.client, {
            userId,
            guildId: message.guild.id,
            channelId: message.channel.id,
            remindAt: new Date(Date.now() + 1800000),
            type: 'raid_spawn',
            reminderMessage: `<@${userId}>, your </raid spawn:1472170030723764364> cooldown is up!`,
          });
        } catch (error) {
          if (error.code !== 11000) {
            console.error(`[ERROR] Failed to create reminder for raid spawn: ${error.message}`, error);
            await sendError(`[ERROR] Failed to create reminder for raid spawn: ${error.message}`);
          }
        }
      }
    }

    // CARD DROP
    if (title.includes("card dropped")) {
      try {
        const footer = embed?.footer;
        const match = footer?.iconURL?.match(/\/(?:avatars|users)\/(\d+)/);

        if (match) {
          const userId = match[1];

          await setTimer(message.client, {
            userId,
            guildId: message.guild.id,
            channelId: message.channel.id,
            remindAt: new Date(Date.now() + 3600000),
            type: 'card_drop',
            reminderMessage: `<@${userId}>, your </drop:1472170029905874977> cooldown is up ! Wish you luck`,
          });
        }
      } catch (error) {
        console.error(`[ERROR] Error processing card drop: ${error.message}`, error);
        await sendError(`[ERROR] Error processing card drop: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`[ERROR] Unhandled error in processMessage: ${error.message}`, error);
  }
}

async function processBossAndCardMessage(message) {
  if (!message.guild || message.author.id !== LUVI_ID) return;
  if (Date.now() - message.createdTimestamp > 60000) return;

  try {
    const embed = message.embeds[0];
    const components = message.components;

    const settings = getSettings(message.guild.id);
    if (!settings) return;

    const bossInfo = embed ? parseBossEmbed(embed) : parseBossComponent(components);
    if (bossInfo) {
      const tierMap = {
        'Tier 1': settings.t1RoleId,
        'Tier 2': settings.t2RoleId,
        'Tier 3': settings.t3RoleId,
      };

      const roleToPing = tierMap[bossInfo.tier];

      if (roleToPing) {
        try {
          await message.channel.send({
            content: `<@&${roleToPing}> **${bossInfo.tier} Boss Spawned!**\nBoss: **${bossInfo.bossName}**`,
            allowedMentions: { roles: [roleToPing] },
          });
        } catch (err) {
          if (err.code === 50013 || err.code === 50001) {
            console.warn(`[WARN] Missing permissions to send boss ping in channel ${message.channel.id}`);
          } else {
            console.error(`[ERROR] Failed to send boss ping: ${err.message}`, err);
            await sendError(`[ERROR] Failed to send boss ping: ${err.message}`);
          }
        }
      }
    }

  } catch (error) {
    console.error(`[ERROR] Unhandled error in processBossAndCardMessage: ${error.message}`, error);
  }
}

module.exports = { processMessage, processBossAndCardMessage };
