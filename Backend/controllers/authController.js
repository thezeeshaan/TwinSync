const db = require('../config/db');

// FIX 3: Increased to 8 characters to avoid UNIQUE constraint collisions.
// 36^8 = ~2.8 trillion combinations, effectively collision-proof.
const generateAlias = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < 8; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `User-${randomString}`;
};

// FIX 1+2: auth_user_id now comes from req.authUser (set by verifySupabaseToken middleware),
// NOT from req.query or req.body. This prevents account enumeration and impersonation.
const getMe = async (req, res) => {
  const auth_user_id = req.authUser.id;

  const client = await db.getClient();
  try {
    // Check if they are a student/admin
    const userRes = await client.query(
      'SELECT role, name, phone FROM users WHERE id = $1',
      [auth_user_id]
    );
    if (userRes.rows.length > 0) {
      const { role, name, phone } = userRes.rows[0];
      return res.json({ exists: true, role, profile: { name, phone } });
    }

    // FIX 4: Also return verification_status so Dashboard can distinguish
    // pending counselors from verified ones.
    const counselorRes = await client.query(
      'SELECT name, phone, verification_status FROM counselors WHERE id = $1',
      [auth_user_id]
    );
    if (counselorRes.rows.length > 0) {
      const { name, phone, verification_status } = counselorRes.rows[0];
      return res.json({ exists: true, role: 'counselor', verification_status, profile: { name, phone } });
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
  // FIX 1+2: Use verified identity from middleware, not client-supplied auth_user_id
  const authUserId = req.authUser.id;
  const authEmail = req.authUser.email;

  const {
    name, phone, age, gender, college, department, roll_number, degree,
    emergency_name, emergency_phone,
    consent_wellbeing, consent_daily, consent_counselor, consent_emergency, consent_peer
  } = req.body;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Get Institute ID by name or code
    const instituteSearch = college || 'IIT Kharagpur';
    let instituteRes = await client.query(
      'SELECT id FROM institutes WHERE name ILIKE $1 OR code ILIKE $1',
      [instituteSearch]
    );

    let instituteId;
    if (instituteRes.rows.length === 0) {
      // If not found, create it
      const tempCode = instituteSearch.substring(0, 10).toUpperCase().replace(/\s+/g, '');
      const insertRes = await client.query(
        'INSERT INTO institutes (name, code) VALUES ($1, $2) RETURNING id',
        [instituteSearch, tempCode]
      );
      instituteId = insertRes.rows[0].id;
    } else {
      instituteId = instituteRes.rows[0].id;
    }

    // 2. Insert into users (email comes from verified JWT, not client body)
    await client.query(
      `INSERT INTO users (id, email, phone, name, gender, role, institute_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [authUserId, authEmail, phone, name, gender, 'student', instituteId]
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
    const message = error.detail || error.message || 'Failed to register student profile';
    res.status(500).json({ error: message });
  } finally {
    client.release();
  }
};

const registerCounselor = async (req, res) => {
  // FIX 1+2: Use verified identity from middleware
  const authUserId = req.authUser.id;
  const authEmail = req.authUser.email;

  const { name, phone, gender, designation, description, is_staff, college } = req.body;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Get Institute ID by name or code
    const instituteSearch = college || 'IIT Kharagpur';
    let instituteRes = await client.query(
      'SELECT id FROM institutes WHERE name ILIKE $1 OR code ILIKE $1',
      [instituteSearch]
    );

    let instituteId;
    if (instituteRes.rows.length === 0) {
      const tempCode = instituteSearch.substring(0, 10).toUpperCase().replace(/\s+/g, '');
      const insertRes = await client.query(
        'INSERT INTO institutes (name, code) VALUES ($1, $2) RETURNING id',
        [instituteSearch, tempCode]
      );
      instituteId = insertRes.rows[0].id;
    } else {
      instituteId = instituteRes.rows[0].id;
    }

    // 2. Insert into counselors (email from verified JWT)
    await client.query(
      `INSERT INTO counselors (id, email, phone, name, gender, designation, description, is_staff, institute_id, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [authUserId, authEmail, phone, name, gender, designation, description, is_staff, instituteId, 'pending']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Counselor registered successfully. Pending verification.', user: { id: authUserId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering counselor:', error);
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
