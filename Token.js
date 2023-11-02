const mongoose = require("mongoose")

const tokenSchema = new mongoose.Schema({
  signature: String
});

module.exports = mongoose.model("Token", tokenSchema)
