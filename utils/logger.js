const { WebhookClient, EmbedBuilder, time, TimestampStyles } = require("discord.js");

// ─────────────────────────────────────────────
// Webhooks (keep your existing URLs)
// ─────────────────────────────────────────────
const errorWebhook = new WebhookClient({
    url: process.env.ERROR_WEBHOOK_URL ||
        "https://discord.com/api/webhooks/1479797810189828263/yvygJV_KEkJVBz-BIrwZCrn2selxfMOJGk7Spzjbzop0EWISvR-jmm_Ju-o7leWvOI1G"
});

const logWebhook = new WebhookClient({
    url: process.env.LOG_WEBHOOK_URL ||
        "https://discord.com/api/webhooks/1479876808575946854/LzYxGKj3Dy8vXNx95y0dclssuwbCovVcxq94lfnM4LMMnfM-E5Wrc1yJNrddW358-nSx"
});

// ─────────────────────────────────────────────
// Config per log type
// ─────────────────────────────────────────────
const LOG_CONFIG = {
    // Timer / reminders
    reminder_start:   { emoji: "⏱️", color: "#5865F2", label: "Reminder Started",    inline: true },
    reminder_end:     { emoji: "✅", color: "#57F287", label: "Reminder Fired",       inline: true },
    reminder_failed:  { emoji: "💥", color: "#ED4245", label: "Reminder Failed",      inline: true },

    // Commands & interactions
    button_click:     { emoji: "🖱️", color: "#5865F2", label: "Button Clicked",       inline: true },

    // Settings
    settings_updated:              { emoji: "⚙️",  color: "#FEE75C", label: "Settings Updated",        inline: true },
    settings_cache_initialized:    { emoji: "📦",  color: "#57F287", label: "Settings Cache Ready",     inline: true },
    user_settings_updated:         { emoji: "👤",  color: "#FEE75C", label: "User Settings Updated",    inline: true },
    user_settings_cache_initialized: { emoji: "📦", color: "#57F287", label: "User Cache Ready",        inline: true },

    // Wishlist
    wishlist_notified: { emoji: "🎯", color: "#C8A2C8", label: "Wishlist Notified",  inline: true },

    // System
    TimerManager_Initialized: { emoji: "🚀", color: "#57F287", label: "Timer Manager Ready", inline: false },
    unhandled_rejection:      { emoji: "💀", color: "#ED4245", label: "Unhandled Rejection",  inline: false },
    uncaught_exception:       { emoji: "💀", color: "#ED4245", label: "Uncaught Exception",   inline: false },
};

// Config per error type
const ERROR_CONFIG = {
    channel_fetch_failed:   { emoji: "📡", color: "#ED4245", label: "Channel Unreachable" },
    channel_invalid:        { emoji: "📡", color: "#ED4245", label: "Invalid Channel" },
    channel_not_found:      { emoji: "📡", color: "#ED4245", label: "Channel Not Found" },
    command_failed:         { emoji: "⚠️",  color: "#FEE75C", label: "Command Failed" },
    stamina_reminder_failed:{ emoji: "⚠️",  color: "#FEE75C", label: "Stamina Reminder Failed" },
    interaction_fatal:      { emoji: "💀", color: "#ED4245", label: "Fatal Interaction Error" },
    TimerManager_Warning:   { emoji: "⚠️",  color: "#FEE75C", label: "Timer Manager Warning" },
};

// ─────────────────────────────────────────────
// Format timestamps as Discord relative time
// ─────────────────────────────────────────────
function formatValue(key, value) {
    // Convert ISO strings to Discord timestamps
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date)) {
            return `${time(date, TimestampStyles.ShortDateTime)} (${time(date, TimestampStyles.RelativeTime)})`;
        }
    }
    if (value instanceof Date && !isNaN(value)) {
        return `${time(value, TimestampStyles.ShortDateTime)} (${time(value, TimestampStyles.RelativeTime)})`;
    }
    return String(value);
}

// ─────────────────────────────────────────────
// Build a premium embed
// ─────────────────────────────────────────────
function buildEmbed({ emoji, color, label, title, fields, inline, isError }) {
    const cfg = { emoji, color, label };

    const embed = new EmbedBuilder()
        .setColor(cfg.color)
        .setAuthor({ name: `Endmin  •  ${isError ? "Error Log" : "System Log"}` })
        .setTitle(`${cfg.emoji}  ${cfg.label || title}`)
        .setTimestamp();

    // Format and lay out fields
    const formatted = fields.map(f => ({
        name: f.name,
        value: formatValue(f.name, f.value) || "\u200b",
        inline: inline ?? false,
    }));

    // Put fields inline in pairs when inline mode is on
    if (inline) {
        const rows = [];
        for (let i = 0; i < formatted.length; i += 2) {
            rows.push({ ...formatted[i], inline: true });
            if (formatted[i + 1]) rows.push({ ...formatted[i + 1], inline: true });
            // Invisible spacer to force 2-col grid
            if (formatted[i + 1] && formatted.length > 2) {
                rows.push({ name: "\u200b", value: "\u200b", inline: true });
            }
        }
        embed.addFields(rows);
    } else {
        embed.addFields(formatted);
    }

    embed.setFooter({ text: isError ? "Endmin — ERROR" : "Endmin — OK" });

    return embed;
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

async function logAction(title, fields = []) {
    const cfg = LOG_CONFIG[title] || { emoji: "💠", color: "#5865F2", label: title, inline: false };

    console.log(`[LOG] ${title}`);

    try {
        const embed = buildEmbed({
            emoji:   cfg.emoji,
            color:   cfg.color,
            label:   cfg.label,
            title,
            fields,
            inline:  cfg.inline,
            isError: false,
        });

        await logWebhook.send({ embeds: [embed], allowed_mentions: { parse: [] } });
    } catch (err) {
        console.error("[LOGGER] Failed to send log webhook:", err.message);
    }
}

async function logError(title, fields = []) {
    const cfg = ERROR_CONFIG[title] || { emoji: "❌", color: "#ED4245", label: title };

    console.error(`[ERROR] ${title}`);

    try {
        const embed = buildEmbed({
            emoji:   cfg.emoji,
            color:   cfg.color,
            label:   cfg.label,
            title,
            fields,
            inline:  false,
            isError: true,
        });

        await errorWebhook.send({ embeds: [embed], allowed_mentions: { parse: [] } });
    } catch (err) {
        console.error("[LOGGER] Failed to send error webhook:", err.message);
    }
}

// Alias used in messageProcessor
async function sendError(message) {
    await logError("Error", [{ name: "Details", value: message }]);
}

module.exports = { logAction, logError, sendError };
