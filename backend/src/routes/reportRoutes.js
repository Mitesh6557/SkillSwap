/**
 * SkillSwap - Trust & Safety User Report Routes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth } = require('../middleware/auth');

// Public list of standard report reasons
router.get('/reasons', reportController.getReasons);

// Submitting a report requires authentication
router.post('/', auth, reportController.createReport);

module.exports = router;
