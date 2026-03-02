const REQUIRED_ROLES_FOR_T3 = [
  "1295761591895064577",
  "1450472679021740043",
  "1297161626910462016"
];

const ROLE_TIER_1 = "1439616771622572225";
const ROLE_TIER_2 = "1439616926170218669";
const ROLE_TIER_3 = "1439616971908972746";

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const member = interaction.member;

    // Tier 1
    if (interaction.customId === "tier1") {
      const role = interaction.guild.roles.cache.get(ROLE_TIER_1);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return interaction.reply({ content: "Removed Tier 1 role.", ephemeral: true });
      }

      await member.roles.add(role);
      return interaction.reply({ content: "Added Tier 1 role.", ephemeral: true });
    }

    // Tier 2
    if (interaction.customId === "tier2") {
      const role = interaction.guild.roles.cache.get(ROLE_TIER_2);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return interaction.reply({ content: "Removed Tier 2 role.", ephemeral: true });
      }

      await member.roles.add(role);
      return interaction.reply({ content: "Added Tier 2 role.", ephemeral: true });
    }

    // Tier 3 (requires roles)
    if (interaction.customId === "tier3") {
      const role = interaction.guild.roles.cache.get(ROLE_TIER_3);

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return interaction.reply({ content: "Removed Tier 3 role.", ephemeral: true });
      }

      const hasRequired = member.roles.cache.some(r =>
        REQUIRED_ROLES_FOR_T3.includes(r.id)
      );

      if (!hasRequired) {
        return interaction.reply({
          content: "Keep grinding nub or join our clan to be strong.",
          ephemeral: true
        });
      }

      await member.roles.add(role);
      return interaction.reply({ content: "Added Tier 3 role.", ephemeral: true });
    }
  }
};
