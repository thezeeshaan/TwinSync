const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  getLifestyle,
  saveLifestyle,
  getTodayStatus,
  sendCheckinMessage,
  completeCheckin,
} = require('../controllers/checkinController');

// All routes are protected — require valid JWT
router.get('/lifestyle',   verifySupabaseToken, getLifestyle);       // Check if lifestyle exists
router.post('/lifestyle',  verifySupabaseToken, saveLifestyle);      // Save lifestyle profile
router.get('/today',       verifySupabaseToken, getTodayStatus);     // Already checked in today?
router.post('/chat',       verifySupabaseToken, sendCheckinMessage); // Send msg → get AI reply
router.post('/complete',   verifySupabaseToken, completeCheckin);    // Save session + update streak

module.exports = router;
