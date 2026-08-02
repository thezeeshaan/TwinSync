const db = require('../config/db');

/**
 * GET /api/dashboard/courses
 * Returns all mental health courses (public read for authenticated users).
 */
const getCourses = async (req, res) => {
  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT id, title, description, content_url, thumbnail_url, created_at
       FROM mental_health_courses
       ORDER BY created_at DESC`
    );
    res.json({ courses: result.rows });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/dashboard/events
 * Returns upcoming campus events (event_date >= NOW()).
 */
const getEvents = async (req, res) => {
  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT id, title, description, event_date, location, created_at
       FROM campus_events
       WHERE event_date >= NOW()
       ORDER BY event_date ASC`
    );
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  } finally {
    client.release();
  }
};

module.exports = { getCourses, getEvents };
