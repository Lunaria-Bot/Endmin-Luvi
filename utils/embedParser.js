function parseBossEmbed(embed) {
  if (!embed?.title) return null;

  if (!/<:LU_Monster:\d+>/.test(embed.title)) return null;

  const bossName = embed.title.replace(/<:LU_Monster:\d+>\s*/, '').trim();
  if (!bossName) return null;

  let tier = null;
  for (const field of embed.fields ?? []) {
    const match = field.value.match(/<:LU_Tier(\d+):\d+>/);
    if (match) {
      tier = `Tier ${match[1]}`;
      break;
    }
  }

  return tier ? { bossName, tier } : null;
}

function parseBossComponent(components) {
  if (!components?.length) return null;
  const root = components[0];
  if (root.type !== 17) return null;

  let bossName = null;
  let tier = null;

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

module.exports = {
  parseBossEmbed,
  parseBossComponent,
  parseExpeditionEmbed,
  parseExpeditionComponent,
  parseRaidViewEmbed,
  parseRaidViewComponent,
};
