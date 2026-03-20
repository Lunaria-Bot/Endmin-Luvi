const mongoose = require('mongoose');

const changelogSchema = new mongoose.Schema({
  version:     { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  entries: [{
    type:    { type: String, enum: ['new', 'fix', 'improve', 'remove'], default: 'new' },
    content: { type: String, required: true },
  }],
  published:   { type: Boolean, default: false },
  discordSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.Changelog
  || mongoose.model('Changelog', changelogSchema);
