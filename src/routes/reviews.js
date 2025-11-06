const express = require('express');
const { 
  validateReview, 
  getBookReviews, 
  createReview, 
  updateReview, 
  deleteReview 
} = require('../controllers/reviewController');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/book/:bookId', getBookReviews);

router.use(auth);

router.post('/book/:bookId', validateReview, createReview);
router.put('/:id', validateReview, updateReview);
router.delete('/:id', deleteReview);

module.exports = router;