const express = require('express');
const router = express.Router();
const { registerStudent, registerCounselor, getMe } = require('../controllers/authController');
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');

// All routes are protected — caller must send a valid Supabase JWT
router.get('/me', verifySupabaseToken, getMe);
router.post('/register-student', verifySupabaseToken, registerStudent);
router.post('/register-counselor', verifySupabaseToken, registerCounselor);

module.exports = router;
