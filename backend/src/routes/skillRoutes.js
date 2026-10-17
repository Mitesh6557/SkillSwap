/**
 * SkillSwap - Skill Routes
 */

const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const auth = require('../middleware/auth');

// Public catalog routes
router.get('/', skillController.getAll);
router.get('/categories', skillController.getCategories);

// Authenticated skill routes
router.post('/', auth, skillController.create);
router.put('/:id', auth, skillController.update);
router.post('/user', auth, skillController.addUserSkill);
router.put('/user/:userSkillId', auth, skillController.updateUserSkill);
router.delete('/user/:userSkillId', auth, skillController.removeUserSkill);

module.exports = router;
