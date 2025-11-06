const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titre est requis'],
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Auteur est requis'],
    trim: true
  },
  isbn: {
    type: String,
    required: [true, 'ISBN est requis'],
    unique: true,
    trim: true
  },
  genre: {
    type: String,
    required: [true, 'Genre est requis'],
    enum: ['Roman', 'Science-Fiction', 'Fantasy', 'Policier', 'Biographie', 'Histoire', 'Jeunesse']
  },
  publicationYear: {
    type: Number,
    required: [true, 'Année de publication est requise'],
    min: [1000, 'Année invalide'],
    max: [new Date().getFullYear(), 'Année dans le futur']
  },
  publisher: {
    type: String,
    required: [true, 'Éditeur est requis']
  },
  pages: {
    type: Number,
    required: [true, 'Nombre de pages requis'],
    min: [1, 'Doit avoir au moins 1 page']
  },
  summary: {
    type: String,
    maxlength: 2000
  },
  available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

bookSchema.index({ title: 'text', author: 'text', summary: 'text' });

module.exports = mongoose.model('Book', bookSchema);