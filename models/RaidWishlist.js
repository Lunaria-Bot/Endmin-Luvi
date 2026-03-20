const mongoose = require('mongoose');

const raidWishlistSchema = new mongoose.Schema({
  userId:   { type: String, required: true },
  raidName: { type: String, required: true }, // normalized lowercase
}, {
  timestamps: true,
});

// One entry per user per raid
raidWishlistSchema.index({ userId: 1, raidName: 1 }, { unique: true });

module.exports = mongoose.models.RaidWishlist
  || mongoose.model('RaidWishlist', raidWishlistSchema);
