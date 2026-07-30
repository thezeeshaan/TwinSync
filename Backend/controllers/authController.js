const db = require('../config/db');

// Helper to generate an anonymous alias (e.g. User-5a3f)
const generateAlias = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 4; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `User-${randomString}`;
};

const getMe = async (req, res) => {
  const { auth_user_id } = req.query;
  if (!auth_user_id) return res.status(400).json({ error: 'auth_user_id is required' });

  const client = await db.getClient();
  try {
    // Check if they are a student/admin
    const userRes = await client.query('SELECT role, name, phone FROM users WHERE id = $1', [auth_user_id]);
    if (userRes.rows.length > 0) {
      const { role, name, phone } = userRes.rows[0];
      return res.json({ exists: true, role, profile: { name, phone } });
    }
    
    // Check if they are a counselor
    const counselorRes = await client.query('SELECT name, phone FROM counselors WHERE id = $1', [auth_user_id]);
    if (counselorRes.rows.length > 0) {
      const { name, phone } = counselorRes.rows[0];
      return res.json({ exists: true, role: 'counselor', profile: { name, phone } });
    }

    return res.json({ exists: false, role: null });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};


const registerStudent = async (req, res) => {
  const {
    auth_user_id,
    name, email, phone, age, gender, college, department, roll_number, degree,
    emergency_name, emergency_phone,
    consent_wellbeing, consent_daily, consent_counselor, consent_emergency, consent_peer
  } = req.body;
  
  if (!auth_user_id) {
    return res.status(400).json({ error: 'auth_user_id is required' });
  }
  const authUserId = auth_user_id;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Get Institute ID by name or code
    const instituteSearch = college || 'IIT Kharagpur';
    let instituteRes = await client.query('SELECT id FROM institutes WHERE name ILIKE $1 OR code ILIKE $1', [instituteSearch]);
    
    let instituteId;
    if (instituteRes.rows.length === 0) {
      // If not found, insert it
      const tempCode = instituteSearch.substring(0, 10).toUpperCase().replace(/\s+/g, '');
      const insertRes = await client.query('INSERT INTO institutes (name, code) VALUES ($1, $2) RETURNING id', [instituteSearch, tempCode]);
      instituteId = insertRes.rows[0].id;
    } else {
      instituteId = instituteRes.rows[0].id;
    }

    // 2. Insert into users
    await client.query(
      `INSERT INTO users (id, email, phone, name, gender, role, institute_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [authUserId, email, phone, name, gender, 'student', instituteId]
    );

    // 3. Insert into student_profiles
    const alias = generateAlias();
    await client.query(
      `INSERT INTO student_profiles (user_id, age, department, roll_number, degree, emergency_contact_name, emergency_contact_phone, anonymous_alias)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [authUserId, parseInt(age), department, roll_number, degree, emergency_name, emergency_phone, alias]
    );

    // 4. Insert into user_consents
    await client.query(
      `INSERT INTO user_consents (user_id, campus_wellbeing, daily_recommendations, counselor_sharing, emergency_protocols, anonymous_peer_support, consented_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [authUserId, consent_wellbeing, consent_daily, consent_counselor, consent_emergency, consent_peer]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Student registered successfully', user: { id: authUserId, alias } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering student:', error);
    // FIX Bug 5: Surface the real DB error (e.g. duplicate email) to the client
    const message = error.detail || error.message || 'Failed to register student profile';
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
};

const registerCounselor = async (req, res) => {
  const { auth_user_id, name, email, phone, gender, designation, description, is_staff, college } = req.body;
  
  if (!auth_user_id) {
    return res.status(400).json({ error: 'auth_user_id is required' });
  }
  const authUserId = auth_user_id;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Get Institute ID by name or code
    const instituteSearch = college || 'IIT Kharagpur';
    let instituteRes = await client.query('SELECT id FROM institutes WHERE name ILIKE $1 OR code ILIKE $1', [instituteSearch]);
    
    let instituteId;
    if (instituteRes.rows.length === 0) {
      // If not found, insert it
      const tempCode = instituteSearch.substring(0, 10).toUpperCase().replace(/\s+/g, '');
      const insertRes = await client.query('INSERT INTO institutes (name, code) VALUES ($1, $2) RETURNING id', [instituteSearch, tempCode]);
      instituteId = insertRes.rows[0].id;
    } else {
      instituteId = instituteRes.rows[0].id;
    }

    // 2. Insert into counselors
    await client.query(
      `INSERT INTO counselors (id, email, phone, name, gender, designation, description, is_staff, institute_id, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [authUserId, email, phone, name, gender, designation, description, is_staff, instituteId, 'pending']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Counselor registered successfully. Pending verification.', user: { id: authUserId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering counselor:', error);
    // FIX Bug 5: Surface the real DB error to the client
    const message = error.detail || error.message || 'Failed to register counselor profile';
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
};

module.exports = {
  getMe,
  registerStudent,
  registerCounselor
};
