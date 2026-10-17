/**
 * SkillSwap - Admin Routes
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// All admin routes require auth and admin role
router.use(auth, adminAuth);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/swaps', adminController.getAllSwaps);
router.delete('/skills/:id', adminController.deleteSkill);
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.updateReportStatus);
router.get('/audit-logs', adminController.getAuditLogs);
router.post('/announcements', adminController.createAnnouncement);

// CSV Export endpoints
router.get('/export/users', adminController.exportUsersCsv);
router.get('/export/swaps', adminController.exportSwapsCsv);
router.get('/export/feedback', adminController.exportFeedbackCsv);

module.exports = router;
