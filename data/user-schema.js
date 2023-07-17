const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  discordUsername: {
    type: String,
    required: true
  },
  guildId: {
    type: String, 
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  mp: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('User', userSchema);
