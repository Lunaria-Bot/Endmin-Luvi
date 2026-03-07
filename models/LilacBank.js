const mongoose = require('mongoose');

const LilacBankSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  cores: { type: Number, default: 0 }
});

module.exports = mongoose.model('LilacBank', LilacBankSchema);
