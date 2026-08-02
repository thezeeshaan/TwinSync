const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  getPendingCounselors,
  getAllCounselors,
  verifyCounselor,
  promoteToAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/adminController');

// Middleware: verify token + check admin role
const verifyAdmin = async (req, res, next) => {
  const db = require('../config/db');
  const client = await db.getClient();
  try {
    const result = await client.query(
      'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.authUser.id]
    );
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  } finally {
    client.release();
  }
};

// All admin routes require authentication + admin role
router.use(verifySupabaseToken);
router.use(verifyAdmin);

// Counselor verification management
router.get('/counselors/pending', getPendingCounselors);
router.get('/counselors/all', getAllCounselors);
router.put('/counselors/:counselorId/verify', verifyCounselor);

// Admin promotion
router.put('/promote', promoteToAdmin);

// Content management — Courses & Events
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

module.exports = router;
