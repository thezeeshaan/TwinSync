const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  requestSession,
  cancelSession,
  getSessions,
  getSessionMessages,
  sendSessionMessage,
  endSession,
  toggleAvailability,
  getCounselorProfile,
  getWaitingSessions,
  acceptSession
} = require('../controllers/counselorController');

// All counselor routes require authentication
router.use(verifySupabaseToken);

// Student-facing
router.post('/request', requestSession);
router.post('/sessions/:sessionId/cancel', cancelSession);
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId/messages', getSessionMessages);
router.post('/sessions/:sessionId/messages', sendSessionMessage);
router.post('/sessions/:sessionId/end', endSession);

// Counselor-facing
router.put('/availability', toggleAvailability);
router.get('/profile', getCounselorProfile);
router.get('/waiting', getWaitingSessions);
router.post('/sessions/:sessionId/accept', acceptSession);

module.exports = router;
