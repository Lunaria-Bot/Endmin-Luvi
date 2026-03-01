const mongoose = require('mongoose');

const botSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  t1RoleId: { type: String, default: null },
  t2RoleId: { type: String, default: null },
  t3RoleId: { type: String, default: null },

  raidResetPingChannelId: { type: String, default: null },
  raidResetPingRoleId: { type: String, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('BotSettings', botSettingsSchema);
