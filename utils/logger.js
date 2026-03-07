const { WebhookClient } = require("discord.js");

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
    return fields.map(f => `${f.name} : ${f.value}`).join("\n");
}

// Log normal
async function logAction(title, fields = []) {
    const text =
        `💠 ${title}\n` +
        `────────────────────────\n` +
        `${formatFields(fields)}\n` +
        `────────────────────────`;

    console.log(text);
    await logWebhook.send(text);
}

// Log erreur
async function logError(title, fields = []) {
    const text =
        `❌ ${title}\n` +
        `────────────────────────\n` +
        `${formatFields(fields)}\n` +
        `────────────────────────`;

    console.error(text);
    await errorWebhook.send(text);
}

module.exports = {
    logAction,
    logError
};
