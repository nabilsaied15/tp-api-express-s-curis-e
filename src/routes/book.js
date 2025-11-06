const express = require('express');
const { 
  validateBook, 
  getAllBooks, 
  getBookById, 
  createBook, 
  updateBook, 
  deleteBook 
} = require('../controllers/bookController');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');

const router = express.Router();

router.get('/', getAllBooks);
router.get('/:id', getBookById);

router.use(auth);

router.post('/', requireRole('admin'), validateBook, createBook);
router.put('/:id', requireRole('admin'), validateBook, updateBook);
router.delete('/:id', requireRole('admin'), deleteBook);

module.exports = router;