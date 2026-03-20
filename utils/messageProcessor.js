const {
  parseBossEmbed,
  parseBossComponent,
  parseExpeditionEmbed,
  parseExpeditionComponent,
  parseRaidViewEmbed,
  parseRaidViewComponent,
  parseRaidSpawnEmbed,
  parseRaidSpawnComponent,
} = require('./embedParser');

const { getSettings } = require('./settingsManager');
const Reminder = require('../models/Reminder');
const RaidWishlist = require('../models/RaidWishlist');
const { sendError } = require('./logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { setTimer } = require('./timerManager');
const testRaidSpawnCmd = require('../commands/test-raid-spawn');

const OWNER_ID = '912376040142307419';

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
      for (const { userId, fatigueMillis } of raidInfo) {
        const remindAt = new Date(Date.now() + fatigueMillis);

        const existingReminder = await Reminder.findOne({
          userId,
          type: 'raid',
          remindAt: {
            $gte: new Date(remindAt.getTime() - 5000),
            $lte: new Date(remindAt.getTime() + 5000),
          },
        });

        if (!existingReminder) {
          try {
            await setTimer(message.client, {
              userId,
              channelId: message.channel.id,
              remindAt,
              type: 'raid',
              reminderMessage: `<@${userId}>, your raid fatigue has worn off! You can attack the boss again`,
            });
          } catch (error) {
            if (error.code !== 11000) {
              console.error(`[ERROR] Failed to create reminder for raid fatigue: ${error.message}`, error);
              await sendError(`[ERROR] Failed to create reminder for raid fatigue: ${error.message}`);
            }
          }
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
    const embed      = message.embeds[0];
    const components = message.components;

    const settings = getSettings(message.guild.id);
    if (!settings) return;

    // ── Tier boss ping (existing logic) ───────────────────────────────
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

    // ── Raid spawn wishlist check ──────────────────────────────────────
    // Uses the "Raid Spawned!" embed format (e.g. "You spawned A2 [Elite T3]")
    const spawnInfo = embed
      ? parseRaidSpawnEmbed(embed)
      : parseRaidSpawnComponent(components);

    if (spawnInfo) {
      try {
        const normalizedName = spawnInfo.bossName.trim().toLowerCase();
        const wishers        = await RaidWishlist.find({ raidName: normalizedName }).lean();

        for (const wisher of wishers) {
          try {
            const discordUser = await message.client.users.fetch(wisher.userId);

            const dmEmbed = new EmbedBuilder()
              .setTitle('⚔️  A raid on your wishlist just spawned!')
              .setColor('#C8A2C8')
              .setDescription(
                `**${spawnInfo.bossName}**${spawnInfo.tier ? ` [${spawnInfo.tier}]` : ''} ` +
                `has just spawned in **${message.guild.name}**!\n\nJump in quickly before it's gone.`
              )
              .addFields(
                { name: '📍 Server',  value: message.guild.name,         inline: true },
                { name: '⚔️  Boss',   value: spawnInfo.bossName,         inline: true },
                { name: '🏷️  Tier',   value: spawnInfo.tier || 'Unknown', inline: true },
                { name: '📢 Channel', value: `<#${message.channel.id}>`, inline: true },
              )
              .setFooter({ text: 'Raid Wishlist • /wishlist remove to opt out' })
              .setTimestamp();

            await discordUser.send({ embeds: [dmEmbed] });

          } catch (dmErr) {
            if (dmErr.code !== 50007) {
              console.warn(`[WARN] Could not DM wishlist user ${wisher.userId}:`, dmErr.message);
            }
          }
        }

        if (wishers.length > 0) {
          console.log(`[WISHLIST] Notified ${wishers.length} user(s) about: ${spawnInfo.bossName}`);
        }

      } catch (wishErr) {
        console.error(`[ERROR] Wishlist DM check failed: ${wishErr.message}`, wishErr);
      }

      // ── OWNER TEST MODE ─────────────────────────────────────────────
      if (testRaidSpawnCmd.testModeEnabled()) {
        try {
          const owner = await message.client.users.fetch(OWNER_ID);

          const testEmbed = new EmbedBuilder()
            .setTitle('🧪  [TEST] Raid spawn detected')
            .setColor('#FEE75C')
            .setDescription(
              `A raid spawn was detected and the wishlist system ran.\n\n` +
              `This DM confirms everything is working correctly.`
            )
            .addFields(
              { name: '⚔️  Boss',    value: spawnInfo.bossName,          inline: true },
              { name: '🏷️  Tier',    value: spawnInfo.tier || 'Unknown',  inline: true },
              { name: '📍 Server',   value: message.guild.name,           inline: true },
              { name: '📢 Channel',  value: `<#${message.channel.id}>`,   inline: true },
              { name: '👥 Notified', value: `See logs`,                   inline: true },
            )
            .setFooter({ text: 'Test mode active • /test-raid-spawn to disable' })
            .setTimestamp();

          await owner.send({ embeds: [testEmbed] });
          console.log('[TEST MODE] Owner DM sent for raid spawn:', spawnInfo.bossName);

        } catch (testErr) {
          console.warn('[TEST MODE] Could not DM owner:', testErr.message);
        }
      }
    }

  } catch (error) {
    console.error(`[ERROR] Unhandled error in processBossAndCardMessage: ${error.message}`, error);
  }
}

module.exports = { processMessage, processBossAndCardMessage };
