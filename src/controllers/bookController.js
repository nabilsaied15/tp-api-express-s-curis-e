const { body } = require('express-validator');
const Book = require('../models/Book');
const handleValidationErrors = require('../middlewares/validation');

const validateBook = [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Le titre est requis'),
  body('author')
    .notEmpty()
    .trim()
    .withMessage('L\'auteur est requis'),
  body('isbn')
    .notEmpty()
    .trim()
    .withMessage('L\'ISBN est requis'),
  body('genre')
    .isIn(['Roman', 'Science-Fiction', 'Fantasy', 'Policier', 'Biographie', 'Histoire', 'Jeunesse'])
    .withMessage('Genre invalide'),
  body('publicationYear')
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Année de publication invalide'),
  body('publisher')
    .notEmpty()
    .trim()
    .withMessage('L\'éditeur est requis'),
  body('pages')
    .isInt({ min: 1 })
    .withMessage('Le nombre de pages doit être supérieur à 0'),
  body('summary')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Le résumé ne doit pas dépasser 2000 caractères'),
  handleValidationErrors
];

const getAllBooks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.query.genre) {
      query.genre = req.query.genre;
    }
    
    if (req.query.available) {
      query.available = req.query.available === 'true';
    }
    
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    if (req.query.year) {
      query.publicationYear = parseInt(req.query.year);
    }

    const [books, total] = await Promise.all([
      Book.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Book.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        books,
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
      message: 'Erreur lors de la récupération des livres'
    });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    res.json({
      status: 'success',
      data: { book }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du livre'
    });
  }
};

const createBook = async (req, res) => {
  try {
    const book = await Book.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Livre créé avec succès',
      data: { book }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du livre'
    });
  }
};

const updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    res.json({
      status: 'success',
      message: 'Livre mis à jour avec succès',
      data: { book }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du livre'
    });
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression du livre'
    });
  }
};

module.exports = {
  validateBook,
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};