const { body } = require('express-validator');
const Review = require('../models/Review');
const Book = require('../models/Book');
const handleValidationErrors = require('../middlewares/validation');

const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('La note doit être entre 1 et 5'),
  body('comment')
    .notEmpty()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Le commentaire est requis (max 1000 caractères)'),
  handleValidationErrors
];

const getBookReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ book: req.params.bookId })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ book: req.params.bookId })
    ]);

    res.json({
      status: 'success',
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des avis'
    });
  }
};

const createReview = async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    const review = await Review.create({
      book: req.params.bookId,
      user: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment
    });

    await review.populate('user', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Avis créé avec succès',
      data: { review }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Vous avez déjà posté un avis pour ce livre'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création de l\'avis'
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Avis non trouvé'
      });
    }

    review.rating = req.body.rating;
    review.comment = req.body.comment;
    await review.save();

    await review.populate('user', 'name email');

    res.json({
      status: 'success',
      message: 'Avis mis à jour avec succès',
      data: { review }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour de l\'avis'
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    let review;
    
    if (req.user.role === 'admin') {
      review = await Review.findByIdAndDelete(req.params.id);
    } else {
      review = await Review.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
      });
    }

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Avis non trouvé'
      });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression de l\'avis'
    });
  }
};

module.exports = {
  validateReview,
  getBookReviews,
  createReview,
  updateReview,
  deleteReview
};