const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Livre est requis']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Utilisateur est requis']
  },
  rating: {
    type: Number,
    required: [true, 'Note est requise'],
    min: [1, 'Note minimum: 1'],
    max: [5, 'Note maximum: 5']
  },
  comment: {
    type: String,
    required: [true, 'Commentaire est requis'],
    maxlength: 1000
  }
}, {
  timestamps: true
});

reviewSchema.index({ book: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);