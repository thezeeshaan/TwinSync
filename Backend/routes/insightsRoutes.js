const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  getActiveSession,
  startInsights,
  sendInsightMessage,
  endInsights,
  getTodayTip,
  getPastSessions,
  getPastSessionDetail,
} = require('../controllers/insightsController');

router.get('/active',       verifySupabaseToken, getActiveSession);     // Resume active session
router.post('/start',       verifySupabaseToken, startInsights);        // Start a new PSS session
router.post('/message',     verifySupabaseToken, sendInsightMessage);   // Chat message
router.post('/end',         verifySupabaseToken, endInsights);          // End session, get summary
router.get('/today-tip',    verifySupabaseToken, getTodayTip);          // Today's wellness tip
router.get('/past',         verifySupabaseToken, getPastSessions);      // All past sessions (list)
router.get('/past/:sessionId', verifySupabaseToken, getPastSessionDetail); // One session detail

module.exports = router;
