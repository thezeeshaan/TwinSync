const express = require('express');
const router = express.Router();
const { registerStudent, registerCounselor, getMe } = require('../controllers/authController');

router.get('/me', getMe);
router.post('/register-student', registerStudent);
router.post('/register-counselor', registerCounselor);

module.exports = router;
