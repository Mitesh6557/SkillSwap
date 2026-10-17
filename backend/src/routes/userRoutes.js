/**
 * SkillSwap - User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, optionalAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// Public user discovery
router.get('/', userController.getAll);
router.get('/:id', optionalAuth, userController.getById);

// Protected user profile actions
router.put('/profile', auth, userController.updateProfile);
router.post('/avatar', auth, uploadAvatar.single('avatar'), userController.uploadAvatar);

module.exports = router;
