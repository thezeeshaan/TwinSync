const db = require('../config/db');
const { createClient } = require('@supabase/supabase-js');

// Supabase admin client (service_role — can list auth users by email)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/admin/counselors/pending
 * Returns all counselors with verification_status = 'pending'.
 * Only accessible by admin users.
 * 
 * TODO (Production): Re-enable institute_id scoping so admins only see their own campus counselors.
 */
const getPendingCounselors = async (req, res) => {
  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT 
        c.id, c.name, c.email, c.phone, c.gender, c.designation, 
        c.description, c.is_staff, c.photo_url, c.verification_status,
        c.created_at,
        i.name AS institute_name
      FROM counselors c
      LEFT JOIN institutes i ON i.id = c.institute_id
      WHERE c.verification_status = 'pending' AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`
    );

    res.json({ counselors: result.rows });
  } catch (error) {
    console.error('Error fetching pending counselors:', error);
    res.status(500).json({ error: 'Failed to fetch pending counselors' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/admin/counselors/all
 * Returns all counselors (for admin overview).
 * 
 * TODO (Production): Re-enable institute_id scoping so admins only see their own campus counselors.
 */
const getAllCounselors = async (req, res) => {
  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT 
        c.id, c.name, c.email, c.phone, c.gender, c.designation, 
        c.description, c.is_staff, c.photo_url, c.verification_status,
        c.is_available, c.created_at, c.verified_by, c.verified_at,
        i.name AS institute_name
      FROM counselors c
      LEFT JOIN institutes i ON i.id = c.institute_id
      WHERE c.deleted_at IS NULL
      ORDER BY 
        CASE c.verification_status 
          WHEN 'pending' THEN 0 
          WHEN 'verified' THEN 1 
          WHEN 'rejected' THEN 2 
        END,
        c.created_at ASC`
    );

    res.json({ counselors: result.rows });
  } catch (error) {
    console.error('Error fetching all counselors:', error);
    res.status(500).json({ error: 'Failed to fetch counselors' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/admin/counselors/:counselorId/verify
 * Approve or reject a counselor's application.
 * Body: { action: 'verified' | 'rejected' }
 * 
 * TODO (Production): Re-enable institute_id scoping so admins can only verify their own campus counselors.
 */
const verifyCounselor = async (req, res) => {
  const adminId = req.authUser.id;
  const { counselorId } = req.params;
  const { action } = req.body;

  if (!['verified', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "verified" or "rejected"' });
  }

  const client = await db.getClient();
  try {
    const result = await client.query(
      `UPDATE counselors 
       SET verification_status = $1, 
           verified_by = $2, 
           verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING id, name, verification_status`,
      [action, adminId, counselorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counselor not found' });
    }

    res.json({ 
      message: `Counselor ${action} successfully`,
      counselor: result.rows[0]
    });
  } catch (error) {
    console.error('Error verifying counselor:', error);
    res.status(500).json({ error: 'Failed to update counselor status' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/admin/promote
 * Promote a student to Campus Admin by their email address.
 * Body: { email: 'user@example.com' }
 * 
 * Flow:
 * 1. Look up the auth user by email via Supabase Admin API
 * 2. Verify they exist in our `users` table with role = 'student'
 * 3. Update their role to 'admin'
 */
const promoteToAdmin = async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const client = await db.getClient();
  try {
    // Step 1: Look up auth user by email via Supabase Admin API
    const normalizedEmail = email.trim().toLowerCase();

    let authUser = null;
    let page = 1;
    const perPage = 100;

    while (!authUser) {
      const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (authError) {
        console.error('Supabase admin listUsers error:', authError);
        return res.status(500).json({ error: 'Failed to look up user.' });
      }

      const users = data?.users || [];
      authUser = users.find(u => u.email?.toLowerCase() === normalizedEmail) || null;

      // If we got fewer than perPage results, we've reached the end.
      if (users.length < perPage) break;
      page += 1;
    }

    if (!authUser) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }
    // Step 2: Check if they exist in our users table
    const userResult = await client.query(
      `SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [authUser.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'This email is not registered as a student on TwinSync.' });
    }

    const user = userResult.rows[0];

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'This user is already a Campus Admin.' });
    }

    // Step 3: Promote to admin
    await client.query(
      `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`,
      [authUser.id]
    );

    res.json({ 
      message: `User promoted to Campus Admin successfully.`,
      promoted_user_id: authUser.id
    });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Failed to promote user.' });
  } finally {
    client.release();
  }
};

// ============================================================
// CONTENT MANAGEMENT — Courses & Events
// ============================================================

/**
 * POST /api/admin/courses
 * Add a new mental health course.
 * Body: { title, description, content_url, thumbnail_url }
 */
const createCourse = async (req, res) => {
  const { title, description, content_url, thumbnail_url } = req.body;

  if (!title || !content_url) {
    return res.status(400).json({ error: 'Title and Content URL are required.' });
  }

  const client = await db.getClient();
  try {
    const result = await client.query(
      `INSERT INTO mental_health_courses (title, description, content_url, thumbnail_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, created_at`,
      [title.trim(), description?.trim() || null, content_url.trim(), thumbnail_url?.trim() || null]
    );

    res.status(201).json({ message: 'Course added successfully.', course: result.rows[0] });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to add course.' });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/admin/courses/:id
 * Delete a mental health course.
 */
const deleteCourse = async (req, res) => {
  const adminId = req.authUser.id;
  const { id } = req.params;
  const client = await db.getClient();
  try {
    const result = await client.query(
      `DELETE FROM mental_health_courses mhc
       USING users u
       WHERE mhc.id = $1 AND u.id = $2 AND mhc.institute_id = u.institute_id
       RETURNING mhc.id, mhc.title`,
      [id, adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not from your institute.' });
    }
    res.json({ message: 'Course deleted.', course: result.rows[0] });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course.' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/admin/courses/:id
 * Update an existing mental health course.
 * Body: { title, description, content_url, thumbnail_url }
 */
const updateCourse = async (req, res) => {
  const adminId = req.authUser.id;
  const { id } = req.params;
  const { title, description, content_url, thumbnail_url } = req.body;

  if (!title || !content_url) {
    return res.status(400).json({ error: 'Title and Content URL are required.' });
  }

  const client = await db.getClient();
  try {
    const result = await client.query(
      `UPDATE mental_health_courses mhc
       SET title = $1, description = $2, content_url = $3, thumbnail_url = $4
       FROM users u
       WHERE mhc.id = $5 AND u.id = $6 AND mhc.institute_id = u.institute_id
       RETURNING mhc.id, mhc.title`,
      [title.trim(), description?.trim() || null, content_url.trim(), thumbnail_url?.trim() || null, id, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not from your institute.' });
    }

    res.json({ message: 'Course updated successfully.', course: result.rows[0] });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course.' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/admin/events
 * Add a new campus event.
 * Body: { title, description, event_date, location }
 */
const createEvent = async (req, res) => {
  const adminId = req.authUser.id;
  const { title, description, event_date, location } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and Event Date are required.' });
  }

  // Get admin's institute_id for the FK
  const client = await db.getClient();
  try {
    const adminRes = await client.query(`SELECT institute_id FROM users WHERE id = $1`, [adminId]);
    const instituteId = adminRes.rows[0]?.institute_id;

    if (!instituteId) {
      return res.status(400).json({ error: 'Admin institute not found. Cannot create event.' });
    }

    const result = await client.query(
      `INSERT INTO campus_events (title, description, event_date, location, institute_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, event_date, created_at`,
      [title.trim(), description?.trim() || null, event_date, location?.trim() || null, instituteId, adminId]
    );

    res.status(201).json({ message: 'Event added successfully.', event: result.rows[0] });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to add event.' });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/admin/events/:id
 * Delete a campus event.
 */
const deleteEvent = async (req, res) => {
  const adminId = req.authUser.id;
  const { id } = req.params;
  const client = await db.getClient();
  try {
    const result = await client.query(
      `DELETE FROM campus_events ce
       USING users u
       WHERE ce.id = $1 AND u.id = $2 AND ce.institute_id = u.institute_id
       RETURNING ce.id, ce.title`,
      [id, adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not from your institute.' });
    }
    res.json({ message: 'Event deleted.', event: result.rows[0] });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event.' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/admin/events/:id
 * Update an existing campus event.
 * Body: { title, description, event_date, location }
 */
const updateEvent = async (req, res) => {
  const adminId = req.authUser.id;
  const { id } = req.params;
  const { title, description, event_date, location } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and Event Date are required.' });
  }

  const client = await db.getClient();
  try {
    const result = await client.query(
      `UPDATE campus_events ce
       SET title = $1, description = $2, event_date = $3, location = $4
       FROM users u
       WHERE ce.id = $5 AND u.id = $6 AND ce.institute_id = u.institute_id
       RETURNING ce.id, ce.title`,
      [title.trim(), description?.trim() || null, event_date, location?.trim() || null, id, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not from your institute.' });
    }

    res.json({ message: 'Event updated successfully.', event: result.rows[0] });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/admin/events
 * Returns ALL campus events (including past) for admin management.
 */
const getAllEvents = async (req, res) => {
  const adminId = req.authUser.id;
  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT ce.id, ce.title, ce.description, ce.event_date, ce.location, ce.created_at
       FROM campus_events ce
       JOIN users u ON ce.institute_id = u.institute_id
       WHERE u.id = $1
       ORDER BY ce.event_date DESC`,
      [adminId]
    );
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching all events for admin:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  } finally {
    client.release();
  }
};

module.exports = {
  getPendingCounselors,
  getAllCounselors,
  verifyCounselor,
  promoteToAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents
};

