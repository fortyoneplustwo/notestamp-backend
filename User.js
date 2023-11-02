const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
    lowercase: true,
		unique: true
  },
  password: String,
  salt: String,
  documents: []
})

module.exports = mongoose.model("User", userSchema)
