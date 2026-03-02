const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model("WorldAttackOptOut", schema);
