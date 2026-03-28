const {
  parseInventoryPageFromFields,
  extractPage,
  formatSummary
} = require("./inventoryParser");

const LUVI_ID = "1269481871021047891";

module.exports = {
  processInventoryMessage,
  processInventoryReaction,
  processInventoryUpdate
};

async function processInventoryMessage(msg, client) {
  if (msg.author.id !== LUVI_ID) return;
  if (!msg.embeds.length) return;

  const embed = msg.embeds[0];
  if (!embed.title || !embed.title.includes("Inventory")) return;

  client.inventorySessions.set(String(msg.id), {
    messageId: String(msg.id),
    pages: {},
    summaryMessageId: null
  });

  try {
    await msg.react("🔍");
  } catch {}
}

async function processInventoryReaction(reaction, user, client) {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  if (reaction.emoji.name !== "🔍") return;

  const msg = reaction.message;
  if (msg.author.id !== LUVI_ID) return;
  if (!msg.embeds.length) return;

  const embed = msg.embeds[0];
  if (!embed.title || !embed.title.includes("Inventory")) return;

  const session = client.inventorySessions.get(String(msg.id));
  if (!session) return;

  const cards = parseInventoryPageFromFields(embed.fields);
  session.pages[1] = cards;

  const grouped = groupCards(cards);
  const summary = formatSummary(grouped);

  const summaryMsg = await msg.channel.send(summary);
  session.summaryMessageId = summaryMsg.id;
}

async function processInventoryUpdate(newMsg, client) {
  if (newMsg.author?.id !== LUVI_ID) return;
  if (!newMsg.embeds.length) return;

  const embed = newMsg.embeds[0];
  if (!embed.title || !embed.title.includes("Inventory")) return;
  if (!embed.fields.length) return;

  const session = client.inventorySessions.get(String(newMsg.id));
  if (!session) return;

  const page = extractPage(embed.description);
  const cards = parseInventoryPageFromFields(embed.fields);

  session.pages[page] = cards;

  if (!session.summaryMessageId) return;

  const allCards = Object.values(session.pages).flat();
  const grouped = groupCards(allCards);
  const text = formatSummary(grouped);

  try {
    const summaryMsg = await newMsg.channel.messages.fetch(session.summaryMessageId);
    await summaryMsg.edit(text);
  } catch {}
}

/* ---------------------------------------------------------
   Nouveau système de grouping : nom + grade
--------------------------------------------------------- */
function groupCards(cards) {
  const grouped = {};

  for (const card of cards) {
    if (!grouped[card.rarity]) grouped[card.rarity] = {};

    const key = `${card.name}_${card.grade}`;

    if (!grouped[card.rarity][key]) {
      grouped[card.rarity][key] = {
        name: card.name,
        grade: card.grade,
        count: 0,
        modifiers: card.modifiers
      };
    }

    grouped[card.rarity][key].count++;
  }

  return grouped;
}
