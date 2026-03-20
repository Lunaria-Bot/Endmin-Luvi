/**
 * parseBossEmbed — Detects a world boss spawn.
 * Title format:  "<:LU_Monster:ID> Goblin Slayer"
 * Tier format:   field value contains "<:LU_TierN:ID>"
 */
function parseBossEmbed(embed) {
  if (!embed?.title) return null;
  if (!/<:LU_Monster:\d+>/.test(embed.title)) return null;

  const bossName = embed.title.replace(/<:[^>]+>\s*/g, '').trim();
  if (!bossName) return null;

  let tier = null;
  for (const field of embed.fields ?? []) {
    const match = field.value.match(/<:LU_Tier(\d+):\d+>/);
    if (match) { tier = `Tier ${match[1]}`; break; }
  }

  return tier ? { bossName, tier } : null;
}

/**
 * parseBossComponent — Same but for component-based boss spawn messages.
 */
function parseBossComponent(components) {
  if (!components?.length) return null;
  const root = components[0];
  if (root.type !== 17) return null;

  let bossName = null;
  let tier     = null;

  for (const comp of root.components ?? []) {
    if (comp.type === 10) {
      if (comp.id === 2) bossName = comp.content.replace(/\*\*/g, '').trim();
      if (comp.id === 3) {
        const match = comp.content.match(/<:LU_Tier(\d+):\d+>/);
        if (match) tier = `Tier ${match[1]}`;
      }
    }
  }

  return bossName && tier ? { bossName, tier } : null;
}

function parseExpeditionEmbed(embed) {
  if (!embed?.title?.endsWith("s Expeditions")) return null;

  const usernameMatch = embed.title.match(/^(?:\S+\s)?(.+)'s Expeditions$/);
  if (!usernameMatch) return null;

  const username = usernameMatch[1];
  const cards = [];

  for (const field of embed.fields ?? []) {
    const cardNameMatch = field.name.match(/>\s*([^|]+)/);
    const cardName = cardNameMatch ? cardNameMatch[1].trim() : 'Unknown Card';

    const cardIdMatch = field.value.match(/ID: (\d+)/);
    const timeMatch = field.value.match(/(?:⏳|\u23f3|⌛) \*\*(\d+h)?\s*(\d+m)?\s*(\d+s)? remaining\*\*/);

    if (!cardIdMatch || !timeMatch) continue;

    let remainingMillis = 0;
    if (timeMatch[1]) remainingMillis += parseInt(timeMatch[1]) * 3600000;
    if (timeMatch[2]) remainingMillis += parseInt(timeMatch[2]) * 60000;
    if (timeMatch[3]) remainingMillis += parseInt(timeMatch[3]) * 1000;
    else if (timeMatch[1] || timeMatch[2]) remainingMillis += 59000;

    if (remainingMillis > 0) {
      cards.push({ cardId: cardIdMatch[1], cardName, remainingMillis });
    }
  }

  return cards.length ? { username, cards } : null;
}

function parseExpeditionComponent(components) {
  if (!components?.length) return null;
  const root = components[0];
  if (root.type !== 17) return null;

  let username = null;
  const cards = [];

  for (const comp of root.components ?? []) {
    if (comp.type === 10 && comp.id === 2) {
      const match = comp.content.match(/^(.+)'s Expeditions$/);
      if (match) username = match[1];

      if (comp.content === "**Expedition Resend Results**") {
        return { isResend: true };
      }
    }

    if (comp.type === 9) {
      const cardTextComp = comp.components?.find(c => c.type === 10);
      if (!cardTextComp) continue;

      const content = cardTextComp.content;
      const cardNameMatch = content.match(/<:LU_[ELR]:\d+>\s*(.+)/);
      const cardName = cardNameMatch ? cardNameMatch[1].split('\n')[0].trim() : 'Unknown Card';

      const cardIdMatch = content.match(/ID: (\d+)/);
      const timeMatch = content.match(/(?:⏳|\u23f3|⌛)\s*(\d+h)?\s*(\d+m)?\s*(\d+s)? remaining/);

      if (!cardIdMatch || !timeMatch) continue;

      let remainingMillis = 0;
      if (timeMatch[1]) remainingMillis += parseInt(timeMatch[1]) * 3600000;
      if (timeMatch[2]) remainingMillis += parseInt(timeMatch[2]) * 60000;
      if (timeMatch[3]) remainingMillis += parseInt(timeMatch[3]) * 1000;
      else if (timeMatch[1] || timeMatch[2]) remainingMillis += 59000;

      if (remainingMillis > 0) {
        cards.push({ cardId: cardIdMatch[1], cardName, remainingMillis });
      }
    }
  }

  return username && cards.length ? { username, cards } : null;
}

function parseRaidViewEmbed(embed) {
  if (!embed) return null;

  const partyField = embed.fields?.find(f => f.name.includes('Party Members'));
  if (!partyField) return null;

  const fatiguedUsers = [];

  for (const line of partyField.value.split('\n')) {
    if (!line.includes('Fatigued')) continue;

    const userIdMatch = line.match(/<@(\d+)>/);
    const timeMatch = line.match(/Fatigued \((.*)\)/);

    if (!userIdMatch || !timeMatch) continue;

    let fatigueMillis = 0;
    const minutes = timeMatch[1].match(/(\d+)m/);
    const seconds = timeMatch[1].match(/(\d+)s/);

    if (minutes) fatigueMillis += parseInt(minutes[1]) * 60000;
    if (seconds) fatigueMillis += parseInt(seconds[1]) * 1000;

    if (fatigueMillis > 0) {
      fatiguedUsers.push({ userId: userIdMatch[1], fatigueMillis });
    }
  }

  return fatiguedUsers.length ? fatiguedUsers : null;
}

function parseRaidViewComponent(components) {
  if (!components?.length) return null;
  const root = components[0];
  if (root.type !== 17) return null;

  const partyComp = root.components?.find(c => c.type === 10 && c.content.includes('Party Members'));
  if (!partyComp) return null;

  const fatiguedUsers = [];

  for (const line of partyComp.content.split('\n')) {
    if (!line.includes('Fatigued')) continue;

    const userIdMatch = line.match(/<@(\d+)>/);
    const timeMatch = line.match(/Fatigued \((.*)\)/);

    if (!userIdMatch || !timeMatch) continue;

    let fatigueMillis = 0;
    const minutes = timeMatch[1].match(/(\d+)m/);
    const seconds = timeMatch[1].match(/(\d+)s/);

    if (minutes) fatigueMillis += parseInt(minutes[1]) * 60000;
    if (seconds) fatigueMillis += parseInt(seconds[1]) * 1000;

    if (fatigueMillis > 0) {
      fatiguedUsers.push({ userId: userIdMatch[1], fatigueMillis });
    }
  }

  return fatiguedUsers.length ? fatiguedUsers : null;
}

/**
 * Parses a "Raid Spawned!" embed from Luvi.
 * Title:       "Raid Spawned!"
 * Description: "You spawned 🏅 A2 [Elite T3] ⚡"
 *              or "You spawned <emoji> BossName [Tier X] <emoji>"
 *
 * Returns { bossName, tier } or null.
 */
function parseRaidSpawnEmbed(embed) {
  if (!embed) return null;
  const title = (embed.title || '').toLowerCase();
  if (!title.includes('raid spawned')) return null;

  const desc = embed.description || '';

  // Extract everything between "spawned" and the end of the boss line
  // Example: "You spawned 🏅 A2 [Elite T3] ⚡"
  // We want:  bossName = "A2", tier = "Elite T3" (or "T3")
  const spawnMatch = desc.match(/you spawned\s+(?:\S+\s+)?(.+)/i);
  if (!spawnMatch) return null;

  const raw = spawnMatch[1].trim();

  // Try to extract tier from brackets: "[Elite T3]", "[T1]", "[Elite T2]" etc.
  const tierMatch = raw.match(/\[([^\]]+)\]/);
  const tier = tierMatch ? tierMatch[1].trim() : null;

  // Boss name = everything before the bracket (strip trailing emojis/spaces)
  const bossName = raw
    .replace(/\[.*\].*$/, '')   // remove [tier] and anything after
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // strip emoji
    .trim();

  if (!bossName) return null;

  return { bossName, tier };
}

/**
 * Same but for component-based messages (v2 component API).
 */
function parseRaidSpawnComponent(components) {
  if (!components?.length) return null;
  const root = components[0];
  if (root.type !== 17) return null;

  for (const comp of root.components ?? []) {
    if (comp.type !== 10) continue;

    const content = comp.content || '';
    if (!content.toLowerCase().includes('raid spawned')) continue;

    // Look for the spawn line in subsequent text components
    const spawnMatch = content.match(/you spawned\s+(?:\S+\s+)?(.+)/i);
    if (!spawnMatch) continue;

    const raw = spawnMatch[1].trim();
    const tierMatch = raw.match(/\[([^\]]+)\]/);
    const tier = tierMatch ? tierMatch[1].trim() : null;
    const bossName = raw
      .replace(/\[.*\].*$/, '')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .trim();

    if (bossName) return { bossName, tier };
  }

  return null;
}

module.exports = {
  parseBossEmbed,
  parseBossComponent,
  parseExpeditionEmbed,
  parseExpeditionComponent,
  parseRaidViewEmbed,
  parseRaidViewComponent,
  parseRaidSpawnEmbed,
  parseRaidSpawnComponent,
};
