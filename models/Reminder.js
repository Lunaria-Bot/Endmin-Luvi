const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: { type: String },
  guildId: { type: String },
  cardId: { type: String },
  channelId: { type: String, required: true },
  remindAt: { type: Date, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['expedition', 'stamina', 'raid', 'raid_spawn', 'card_drop'] 
  },
  reminderMessage: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reminder', reminderSchema);
