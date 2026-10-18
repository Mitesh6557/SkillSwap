/**
 * SkillSwap - Session Routes
 */

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { auth } = require('../middleware/auth');

// All session routes require authentication
router.use(auth);

router.get('/', sessionController.getMySessions);
router.get('/:id', sessionController.getById);
router.post('/', sessionController.create);
router.patch('/:id/status', sessionController.updateStatus);
router.patch('/:id/reschedule', sessionController.reschedule);

module.exports = router;
