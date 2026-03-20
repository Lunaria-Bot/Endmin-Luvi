const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }
});

module.exports =
  mongoose.models.WorldAttackOptOut ||
  mongoose.model("WorldAttackOptOut", schema);
