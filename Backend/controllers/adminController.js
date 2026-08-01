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

module.exports = {
  getPendingCounselors,
  getAllCounselors,
  verifyCounselor,
  promoteToAdmin
};

