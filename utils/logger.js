const { WebhookClient, EmbedBuilder } = require("discord.js");

// 🔴 Webhook erreurs
const errorWebhook = new WebhookClient({
    url: "https://discord.com/api/webhooks/1479797810189828263/yvygJV_KEkJVBz-BIrwZCrn2selxfMOJGk7Spzjbzop0EWISvR-jmm_Ju-o7leWvOI1G"
});

// 🔵 Webhook logs normaux
const logWebhook = new WebhookClient({
    url: "https://discord.com/api/webhooks/1479876808575946854/LzYxGKj3Dy8vXNx95y0dclssuwbCovVcxq94lfnM4LMMnfM-E5Wrc1yJNrddW358-nSx"
});

// Formatage premium
function formatFields(fields) {
    return fields.map(f => ({
        name: f.name,
        value: f.value,
        inline: false
    }));
}

// LOG NORMAL (embed premium)
async function logAction(title, fields = []) {
    const embed = new EmbedBuilder()
        .setTitle(`💠 ${title}`)
        .setColor("#6C63FF") // Violet SaaS premium
        .addFields(formatFields(fields))
        .setFooter({ text: "Endmin System Log — OK" })
        .setTimestamp();

    console.log(`[LOG] ${title}`);

    await logWebhook.send({
        embeds: [embed],
        allowed_mentions: { parse: [] }
    });
}

// LOG ERREUR (embed premium)
async function logError(title, fields = []) {
    const embed = new EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setColor("#FF4D4D") // Rouge SaaS premium
        .addFields(formatFields(fields))
        .setFooter({ text: "Endmin System Log — ERROR" })
        .setTimestamp();

    console.error(`[ERROR] ${title}`);

    await errorWebhook.send({
        embeds: [embed],
        allowed_mentions: { parse: [] }
    });
}

module.exports = {
    logAction,
    logError
};
