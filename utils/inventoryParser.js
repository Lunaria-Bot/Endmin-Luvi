const rarityMap = {
  LU_M: "Mythical",
  LU_L: "Legendary",
  LU_E: "Exotic",
  LU_R: "Rare",
  LU_UC: "Uncommon",
  LU_C: "Common"
};

const modifierMap = {
  LU_Iconic: "Ico",
  LU_Ethereal: "Eth"
};

const gradeMap = {
  LU_SPlusTier: "S+",
  LU_STier: "S",
  LU_ATier: "A",
  LU_BTier: "B",
  LU_CTier: "C",
  LU_DTier: "D"
};

function extractPage(description) {
  if (!description) return 1;
  const match = description.match(/Page\s+(\d+)\s*\/\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

function parseInventoryPageFromFields(fields) {
  const cards = [];

  for (const field of fields) {
    let rawName = field.name.trim();
    const lines = field.value.split("\n").map(l => l.trim());

    let id = null;
    let level = null;
    let type = null;
    let hp = null;
    let atk = null;
    let grade = null;
    let ability = null;
    let series = null;
    let rarity = null;
    let modifier = null;

    // ---------------------------------------------------------
    // 1) EXTRACTION DES TAGS LU_... DANS field.name
    // ---------------------------------------------------------
    const nameTags = [...rawName.matchAll(/:?(LU_[A-Za-z]+):?/g)].map(m => m[1]);

    for (const tag of nameTags) {
      if (!rarity && rarityMap[tag]) rarity = rarityMap[tag];
      if (!modifier && modifierMap[tag]) modifier = modifierMap[tag];
      if (!grade && gradeMap[tag]) grade = gradeMap[tag];
    }

    // ---------------------------------------------------------
    // 2) EXTRACTION DES TAGS LU_... DANS field.value
    // ---------------------------------------------------------
    for (const line of lines) {
      const valueTags = [...line.matchAll(/:?(LU_[A-Za-z]+):?/g)].map(m => m[1]);

      for (const tag of valueTags) {
        if (!rarity && rarityMap[tag]) rarity = rarityMap[tag];
        if (!modifier && modifierMap[tag]) modifier = modifierMap[tag];
        if (!grade && gradeMap[tag]) grade = gradeMap[tag];
      }
    }

    // ---------------------------------------------------------
    // 3) NETTOYAGE DU NOM : suppression emojis + tags + mots
    // ---------------------------------------------------------
    rawName = rawName
      .replace(/<a?:\w+:\d+>/g, "") // emojis custom nommés
      .replace(/<\d+>/g, "")        // emojis custom anonymes
      .replace(/:LU_[A-Za-z]+:/g, "") // tags textuels
      .replace(/[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu, "") // emojis unicode
      .replace(/\bIconic\b/gi, "")   // supprimer Iconic du nom
      .replace(/\bEthereal\b/gi, "") // supprimer Ethereal du nom
      .trim();

    let name = rawName.replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ").trim();

    // ---------------------------------------------------------
    // 4) PARSING DES LIGNES DE DÉTAILS
    // ---------------------------------------------------------
    for (const line of lines) {
      if (line.includes("ID:")) {
        const m = line.match(/ID:\s*`?(\d+)`?/i);
        if (m) id = m[1];
      }

      if (/Level/i.test(line)) {
        const m = line.match(/Level\s+(\d+)/i);
        if (m) level = parseInt(m[1], 10);
      }

      if (line.includes("❤️")) {
        const m = line.match(/❤️\s*([\d,]+)/);
        if (m) hp = parseInt(m[1].replace(/,/g, ""), 10);
      }

      if (line.includes("🗡️")) {
        const m = line.match(/🗡️\s*([\d,]+)/);
        if (m) atk = parseInt(m[1].replace(/,/g, ""), 10);
      }

      if (line.startsWith("Ability:")) {
        ability = line.replace("Ability:", "").trim();
      }

      if (line.startsWith("Series:")) {
        series = line.replace("Series:", "").trim();
      }
    }

    // ---------------------------------------------------------
    // 5) FALLBACKS
    // ---------------------------------------------------------
    if (!rarity) rarity = "Common";

    cards.push({
      name,
      id,
      level,
      type,
      hp,
      atk,
      grade,
      ability,
      series,
      rarity,
      modifiers: modifier ? { short: modifier } : {}
    });
  }

  return cards;
}

function formatSummary(grouped) {
  let text = "Inventory Summary\n";

  const rarityOrder = ["Mythical", "Legendary", "Exotic", "Rare", "Uncommon", "Common"];

  for (const rarity of rarityOrder) {
    if (!grouped[rarity]) continue;

    text += `\n${rarity}:\n`;

    for (const key of Object.keys(grouped[rarity])) {
      const entry = grouped[rarity][key];
      const modPart = entry.modifiers?.short ? ` [${entry.modifiers.short}]` : "";
      text += `• ${entry.name}${modPart} (Grade ${entry.grade ?? "?"}) ×${entry.count}\n`;
    }
  }

  return text;
}

module.exports = {
  extractPage,
  parseInventoryPageFromFields,
  formatSummary
};
