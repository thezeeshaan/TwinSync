const db = require('../config/db');

// ============================================================
// STUDENT-FACING ENDPOINTS
// ============================================================

/**
 * POST /api/counselor/request
 * Student requests a counseling session.
 * - If a counselor is available → instant match (status = 'active')
 * - If no counselor is available → waiting queue (status = 'waiting', counselor_id = NULL)
 */
const requestSession = async (req, res) => {
  const userId = req.authUser.id;

  const client = await db.getClient();
  try {
    // Check if the user is a student/admin in the users table
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only students can request a counseling session.' });
    }

    // Check if student already has a waiting or active session
    const activeCheck = await client.query(
      `SELECT id, status FROM counselor_sessions 
       WHERE user_id = $1 AND status IN ('waiting', 'active')`,
      [userId]
    );
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: activeCheck.rows[0].status === 'waiting'
          ? 'You are already in the waiting queue.'
          : 'You already have an active counseling session.',
        session_id: activeCheck.rows[0].id,
        status: activeCheck.rows[0].status
      });
    }

    // Try to find a random verified + available counselor
    const counselorRes = await client.query(
      `SELECT id FROM counselors 
       WHERE verification_status = 'verified' 
         AND is_available = true
         AND deleted_at IS NULL
       ORDER BY RANDOM() 
       LIMIT 1`
    );

    if (counselorRes.rows.length > 0) {
      // Instant match — counselor is available
      const counselorId = counselorRes.rows[0].id;
      const sessionRes = await client.query(
        `INSERT INTO counselor_sessions (user_id, counselor_id, status)
         VALUES ($1, $2, 'active') RETURNING id, status, started_at`,
        [userId, counselorId]
      );

      return res.status(201).json({ 
        session_id: sessionRes.rows[0].id,
        status: 'active',
        started_at: sessionRes.rows[0].started_at,
        message: 'You have been matched with a counselor. Your identity is hidden.'
      });
    }

    // No counselor available — put student in waiting queue
    const sessionRes = await client.query(
      `INSERT INTO counselor_sessions (user_id, counselor_id, status)
       VALUES ($1, NULL, 'waiting') RETURNING id, status, started_at`,
      [userId]
    );

    res.status(201).json({ 
      session_id: sessionRes.rows[0].id,
      status: 'waiting',
      started_at: sessionRes.rows[0].started_at,
      message: 'No counselors are available right now. You have been placed in the waiting queue.'
    });
  } catch (error) {
    console.error('Error requesting counselor session:', error);
    res.status(500).json({ error: 'Failed to request counseling session' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/counselor/sessions/:sessionId/cancel
 * Student cancels their waiting session.
 */
const cancelSession = async (req, res) => {
  const userId = req.authUser.id;
  const { sessionId } = req.params;

  const client = await db.getClient();
  try {
    const result = await client.query(
      `DELETE FROM counselor_sessions 
       WHERE id = $1 AND user_id = $2 AND status = 'waiting'
       RETURNING id`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No waiting session found to cancel' });
    }

    res.json({ message: 'Waiting session cancelled' });
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/counselor/sessions
 * Returns all counseling sessions for the current user (works for both
 * students and counselors — checks both user_id and counselor_id).
 */
const getSessions = async (req, res) => {
  const userId = req.authUser.id;

  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT 
        cs.id AS session_id,
        cs.status,
        cs.started_at,
        cs.ended_at,
        cs.user_id,
        cs.counselor_id,
        cs.parent_session_id,
        -- Last message preview
        (SELECT content FROM counselor_messages 
         WHERE session_id = cs.id 
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM counselor_messages 
         WHERE session_id = cs.id 
         ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        -- Unread count (messages not from me)
        (SELECT COUNT(*) FROM counselor_messages 
         WHERE session_id = cs.id 
           AND sender_role != CASE WHEN cs.user_id = $1 THEN 'student' ELSE 'counselor' END
           AND is_read = false) AS unread_count
      FROM counselor_sessions cs
      WHERE cs.user_id = $1 OR cs.counselor_id = $1
      ORDER BY 
        CASE cs.status 
          WHEN 'waiting' THEN 0 
          WHEN 'active' THEN 1 
          ELSE 2 
        END,
        cs.started_at DESC`,
      [userId]
    );

    // Add role context for the frontend
    const sessions = result.rows.map(s => ({
      ...s,
      my_role: s.user_id === userId ? 'student' : 'counselor',
      peer_label: s.user_id === userId ? 'Counselor' : 'Student',
      is_returning: !!s.parent_session_id
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/counselor/sessions/:sessionId/messages
 * Fetch messages for a counselor session. Marks unread messages as read.
 */
const getSessionMessages = async (req, res) => {
  const userId = req.authUser.id;
  const { sessionId } = req.params;
  const { before } = req.query;
  const limit = 50;

  const client = await db.getClient();
  try {
    // Verify user is a participant (as student or counselor)
    const sessionCheck = await client.query(
      `SELECT id, user_id, counselor_id FROM counselor_sessions 
       WHERE id = $1 AND (user_id = $2 OR counselor_id = $2)`,
      [sessionId, userId]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this session' });
    }

    const session = sessionCheck.rows[0];
    const myRole = session.user_id === userId ? 'student' : 'counselor';

    // Fetch messages
    let query = `SELECT id, sender_role, content, is_read, created_at
                 FROM counselor_messages
                 WHERE session_id = $1`;
    const params = [sessionId];

    if (before) {
      query += ` AND created_at < $2`;
      params.push(before);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const messagesRes = await client.query(query, params);

    // Mark unread messages from the other party as read
    await client.query(
      `UPDATE counselor_messages 
       SET is_read = true 
       WHERE session_id = $1 AND sender_role != $2 AND is_read = false`,
      [sessionId, myRole]
    );

    // Reverse to chronological order
    const messages = messagesRes.rows.reverse();

    res.json({ messages, my_role: myRole, has_more: messagesRes.rows.length === limit });
  } catch (error) {
    console.error('Error fetching session messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/counselor/sessions/:sessionId/messages
 * Send a message in a counselor session. Automatically determines sender_role.
 */
const sendSessionMessage = async (req, res) => {
  const userId = req.authUser.id;
  const { sessionId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
  }

  const client = await db.getClient();
  try {
    // Verify participant + session is active
    const sessionCheck = await client.query(
      `SELECT id, user_id, counselor_id, status FROM counselor_sessions 
       WHERE id = $1 AND (user_id = $2 OR counselor_id = $2)`,
      [sessionId, userId]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this session' });
    }

    const session = sessionCheck.rows[0];
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'This session has ended. You cannot send more messages.' });
    }

    const senderRole = session.user_id === userId ? 'student' : 'counselor';

    // Insert message
    const msgRes = await client.query(
      `INSERT INTO counselor_messages (session_id, sender_role, content)
       VALUES ($1, $2, $3) RETURNING id, sender_role, content, is_read, created_at`,
      [sessionId, senderRole, content.trim()]
    );

    res.status(201).json({ message: msgRes.rows[0] });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/counselor/sessions/:sessionId/end
 * End a counseling session. Either party can end it.
 */
const endSession = async (req, res) => {
  const userId = req.authUser.id;
  const { sessionId } = req.params;

  const client = await db.getClient();
  try {
    const result = await client.query(
      `UPDATE counselor_sessions 
       SET status = 'completed', ended_at = NOW()
       WHERE id = $1 
         AND (user_id = $2 OR counselor_id = $2)
         AND status = 'active'
       RETURNING id`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active session found to end' });
    }

    res.json({ message: 'Session ended successfully', session_id: result.rows[0].id });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  } finally {
    client.release();
  }
};

// ============================================================
// COUNSELOR-FACING ENDPOINTS
// ============================================================

/**
 * PUT /api/counselor/availability
 * Counselor toggles their availability status.
 */
const toggleAvailability = async (req, res) => {
  const userId = req.authUser.id;
  const { is_available } = req.body;

  if (typeof is_available !== 'boolean') {
    return res.status(400).json({ error: 'is_available must be a boolean' });
  }

  const client = await db.getClient();
  try {
    // Verify this user is a counselor
    const result = await client.query(
      `UPDATE counselors 
       SET is_available = $1, last_seen_at = NOW()
       WHERE id = $2 AND verification_status = 'verified' AND deleted_at IS NULL
       RETURNING id, is_available`,
      [is_available, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Only verified counselors can toggle availability' });
    }

    res.json({ 
      is_available: result.rows[0].is_available,
      message: is_available ? 'You are now available for sessions' : 'You are now offline'
    });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/counselor/profile
 * Returns the counselor's own profile.
 */
const getCounselorProfile = async (req, res) => {
  const userId = req.authUser.id;

  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT id, name, email, phone, designation, description, is_staff,
              verification_status, is_available, last_seen_at, created_at
       FROM counselors WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counselor profile not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Error fetching counselor profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/counselor/waiting
 * Returns all waiting sessions (for counselors to pick up).
 */
const getWaitingSessions = async (req, res) => {
  const counselorId = req.authUser.id;
  const client = await db.getClient();
  try {
    // Verify this is a verified counselor
    const counselorCheck = await client.query(
      `SELECT id FROM counselors 
       WHERE id = $1 AND verification_status = 'verified' AND deleted_at IS NULL`,
      [counselorId]
    );
    if (counselorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only verified counselors can view waiting sessions' });
    }

    const result = await client.query(
      `SELECT id AS session_id, started_at, parent_session_id,
              CASE WHEN parent_session_id IS NOT NULL THEN true ELSE false END AS is_returning
       FROM counselor_sessions
       WHERE status = 'waiting' 
         AND (counselor_id IS NULL OR counselor_id = $1)
       ORDER BY started_at ASC`,
      [counselorId]
    );

    res.json({ waiting: result.rows });
  } catch (error) {
    console.error('Error fetching waiting sessions:', error);
    res.status(500).json({ error: 'Failed to fetch waiting sessions' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/counselor/sessions/:sessionId/accept
 * Counselor accepts a waiting session — assigns themselves and sets status to active.
 */
const acceptSession = async (req, res) => {
  const counselorId = req.authUser.id;
  const { sessionId } = req.params;

  const client = await db.getClient();
  try {
    // Verify this is a verified counselor who is currently available
    const counselorCheck = await client.query(
      `SELECT id FROM counselors 
       WHERE id = $1 AND verification_status = 'verified' AND is_available = true AND deleted_at IS NULL`,
      [counselorId]
    );
    if (counselorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only verified and available counselors can accept sessions' });
    }

    // Claim the waiting session (atomic — prevents race conditions)
    const result = await client.query(
      `UPDATE counselor_sessions 
       SET counselor_id = $1, status = 'active'
       WHERE id = $2 AND status = 'waiting' AND counselor_id IS NULL
       RETURNING id, user_id`,
      [counselorId, sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session is no longer waiting or has been claimed' });
    }

    res.json({ 
      message: 'Session accepted. Anonymous chat is now active.',
      session_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error accepting session:', error);
    res.status(500).json({ error: 'Failed to accept session' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/counselor/reconnect/:sessionId
 * Student reconnects with the same counselor from a past completed session.
 * Creates a new session linked to the original via parent_session_id.
 * If the counselor is available → active. If not → targeted waiting.
 */
const reconnectSession = async (req, res) => {
  const userId = req.authUser.id;
  const { sessionId } = req.params;

  const client = await db.getClient();
  try {
    // 1. Check if student already has a waiting or active session
    const activeCheck = await client.query(
      `SELECT id, status FROM counselor_sessions 
       WHERE user_id = $1 AND status IN ('waiting', 'active')`,
      [userId]
    );
    if (activeCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: activeCheck.rows[0].status === 'waiting'
          ? 'You are already in the waiting queue.'
          : 'You already have an active counseling session.',
        session_id: activeCheck.rows[0].id,
        status: activeCheck.rows[0].status
      });
    }

    // 2. Validate the past session belongs to this student and is completed
    const pastSession = await client.query(
      `SELECT id, counselor_id FROM counselor_sessions 
       WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
      [sessionId, userId]
    );
    if (pastSession.rows.length === 0) {
      return res.status(404).json({ error: 'Past session not found or not eligible for reconnection.' });
    }

    const counselorId = pastSession.rows[0].counselor_id;

    // 3. Check if the original counselor is still verified and available
    const counselorCheck = await client.query(
      `SELECT id, is_available FROM counselors 
       WHERE id = $1 AND verification_status = 'verified' AND deleted_at IS NULL`,
      [counselorId]
    );
    if (counselorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'The counselor from your previous session is no longer available on the platform.' });
    }

    const isAvailable = counselorCheck.rows[0].is_available;

    if (isAvailable) {
      // Instant match — counselor is online
      const newSession = await client.query(
        `INSERT INTO counselor_sessions (user_id, counselor_id, status, parent_session_id)
         VALUES ($1, $2, 'active', $3) RETURNING id, status, started_at`,
        [userId, counselorId, sessionId]
      );

      return res.status(201).json({
        session_id: newSession.rows[0].id,
        status: 'active',
        started_at: newSession.rows[0].started_at,
        message: 'Reconnected with your previous counselor. Your identity remains hidden.'
      });
    }

    // Counselor not online — targeted waiting queue
    const newSession = await client.query(
      `INSERT INTO counselor_sessions (user_id, counselor_id, status, parent_session_id)
       VALUES ($1, $2, 'waiting', $3) RETURNING id, status, started_at`,
      [userId, counselorId, sessionId]
    );

    res.status(201).json({
      session_id: newSession.rows[0].id,
      status: 'waiting',
      started_at: newSession.rows[0].started_at,
      message: 'Your previous counselor is not online right now. You have been placed in their personal queue.'
    });
  } catch (error) {
    console.error('Error reconnecting session:', error);
    res.status(500).json({ error: 'Failed to reconnect session.' });
  } finally {
    client.release();
  }
};

module.exports = {
  requestSession,
  cancelSession,
  getSessions,
  getSessionMessages,
  sendSessionMessage,
  endSession,
  toggleAvailability,
  getCounselorProfile,
  getWaitingSessions,
  acceptSession,
  reconnectSession
};
