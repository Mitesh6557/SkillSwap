/**
 * SkillSwap - Swap Request Routes
 */

const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swapController');
const auth = require('../middleware/auth');

// All swap routes require authentication
router.use(auth);

router.get('/', swapController.getMySwaps);
router.get('/:id', swapController.getById);
router.post('/', swapController.create);
router.patch('/:id/status', swapController.updateStatus);
router.delete('/:id', swapController.withdraw);

module.exports = router;
