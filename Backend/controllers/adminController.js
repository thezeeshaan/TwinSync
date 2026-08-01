const db = require('../config/db');

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
module.exports = {
  getPendingCounselors,
  getAllCounselors,
  verifyCounselor
};
