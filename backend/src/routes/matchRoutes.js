/**
 * SkillSwap - Smart Matches Routes
 */

const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { auth } = require('../middleware/auth');

// All matching routes require authentication
router.use(auth);

router.get('/', matchController.getMatches);

module.exports = router;
