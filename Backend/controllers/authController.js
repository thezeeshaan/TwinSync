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

/**
 * Find or create an institute by name.
 * Uses fuzzy matching: searches by exact name OR partial word match.
 * If no match is found, creates a new institute.
 */
const findOrCreateInstitute = async (client, collegeName) => {
  const searchTerm = collegeName.trim();

  // 1. Try exact match on name (case-insensitive)
  let res = await client.query(
    'SELECT id FROM institutes WHERE name ILIKE $1',
    [searchTerm]
  );
  if (res.rows.length > 0) return res.rows[0].id;

  // 2. Try fuzzy match — check if ALL words from the search appear in the name
  //    e.g. "iit kgp" → words ["iit", "kgp"] → matches "IIT Kharagpur"
  const words = searchTerm.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 0) {
    const conditions = words.map((_, i) => `name ILIKE $${i + 1}`);
    const params = words.map(w => `%${w}%`);
    const fuzzyRes = await client.query(
      `SELECT id FROM institutes WHERE ${conditions.join(' AND ')} LIMIT 1`,
      params
    );
    if (fuzzyRes.rows.length > 0) return fuzzyRes.rows[0].id;
  }

  // 3. Not found — create new institute
  const insertRes = await client.query(
    'INSERT INTO institutes (name) VALUES ($1) RETURNING id',
    [searchTerm]
  );
  return insertRes.rows[0].id;
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
      // Update last_seen_at for online/offline status in Community
      await client.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [auth_user_id]);
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

  // Server-side validation
  const phoneRegex = /^\d{10}$/;
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
  if (!phoneRegex.test(phone)) errors.push('Phone must be exactly 10 digits.');
  const ageNum = parseInt(age);
  if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) errors.push('Age must be between 16 and 100.');
  if (!['male', 'female', 'non_binary', 'prefer_not_to_say'].includes(gender)) errors.push('Invalid gender value.');
  if (!college || college.trim().length < 2) errors.push('College name must be at least 2 characters.');
  if (!department || department.trim().length < 2) errors.push('Department must be at least 2 characters.');
  if (!roll_number || roll_number.trim().length < 1) errors.push('Roll number is required.');
  if (!degree || degree.trim().length < 2) errors.push('Degree must be at least 2 characters.');
  if (!emergency_name || emergency_name.trim().length < 2) errors.push('Emergency contact name must be at least 2 characters.');
  if (!phoneRegex.test(emergency_phone)) errors.push('Emergency phone must be exactly 10 digits.');
  if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Find or create institute (with fuzzy matching + collision-safe codes)
    const instituteId = await findOrCreateInstitute(client, college || 'IIT Kharagpur');

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

  // Server-side validation
  const phoneRegex = /^\d{10}$/;
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
  if (!phoneRegex.test(phone)) errors.push('Phone must be exactly 10 digits.');
  if (!['male', 'female', 'non_binary', 'prefer_not_to_say'].includes(gender)) errors.push('Invalid gender value.');
  if (!college || college.trim().length < 2) errors.push('College name must be at least 2 characters.');
  if (!designation || designation.trim().length < 2) errors.push('Designation must be at least 2 characters.');
  if (!description || description.trim().length < 10) errors.push('Description must be at least 10 characters.');
  if (errors.length > 0) return res.status(400).json({ error: errors.join(' ') });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Find or create institute (with fuzzy matching + collision-safe codes)
    const instituteId = await findOrCreateInstitute(client, college || 'IIT Kharagpur');

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

