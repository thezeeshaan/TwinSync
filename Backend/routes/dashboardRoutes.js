const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const { getCourses, getEvents } = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(verifySupabaseToken);

router.get('/courses', getCourses);
router.get('/events', getEvents);

module.exports = router;
