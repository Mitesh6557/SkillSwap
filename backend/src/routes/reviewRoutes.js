/**
 * SkillSwap - Review Routes
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

// Public: view user's reviews
router.get('/user/:userId', reviewController.getByUser);

// Protected: submit review
router.post('/', auth, reviewController.create);

module.exports = router;
