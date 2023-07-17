const mongoose = require('mongoose');

const embedSchema = new mongoose.Schema({
    name: { type: String, required: true },
    by: {
      type: String,
      required: true
    },
    title: { type: String, maxlength: 256 },   
    author: {
      name: { type: String, maxlength: 256 },
      link: { type: String }, // Ajout de la propriété "link" pour le titre URL
      image: { type: String }
    },
    description: { type: String, maxlength: 4096 },
    color: { type: String },
    thumbnail: { type: String },
    fields: [{
      name: { type: String, maxlength: 256 },
      value: { type: String, maxlength: 1024 }
    }],
    image: { type: String },
    timestamp: { type: Boolean },
    footer: {
      text: { type: String, maxlength: 2048 },
      url: { type: String }
    },
    titleUrl: { type: String } // Ajout de la propriété "titleUrl"
  });
  

module.exports = mongoose.model('Embed', embedSchema );
