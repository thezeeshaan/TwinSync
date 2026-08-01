const db = require('../config/db');

/**
 * GET /api/community/peers
 * Returns all students/admins (excluding self) who have consented to
 * anonymous peer support. Shows anonymous_alias + online status.
 * Per PRD: "all signed-up peers on the platform"
 */
const getPeers = async (req, res) => {
  const userId = req.authUser.id;

  const client = await db.getClient();
  try {
    // Verify caller is a student/admin in the users table
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only students can access community features.' });
    }

    // Fetch all peers with peer support consent, exclude self
    const peersRes = await client.query(
      `SELECT 
        u.id,
        sp.anonymous_alias,
        u.last_seen_at,
        CASE 
          WHEN u.last_seen_at > NOW() - INTERVAL '5 minutes' THEN true 
          ELSE false 
        END AS is_online
      FROM users u
      JOIN student_profiles sp ON sp.user_id = u.id
      JOIN user_consents uc ON uc.user_id = u.id
      WHERE u.id != $1
        AND u.role IN ('student', 'admin')
        AND u.is_active = true
        AND uc.anonymous_peer_support = true
      ORDER BY is_online DESC, sp.anonymous_alias ASC`,
      [userId]
    );

    res.json({ peers: peersRes.rows });
  } catch (error) {
    console.error('Error fetching peers:', error);
    res.status(500).json({ error: 'Failed to fetch peers' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/community/conversations
 * Returns all conversations the current user is part of, with last message
 * preview, unread count, and the peer's anonymous alias.
 */
const getConversations = async (req, res) => {
  const userId = req.authUser.id;

  const client = await db.getClient();
  try {
    const result = await client.query(
      `SELECT 
        cc.id AS conversation_id,
        cc.updated_at,
        -- Determine which participant is the "other" peer
        CASE 
          WHEN cc.participant_one_id = $1 THEN cc.participant_two_id
          ELSE cc.participant_one_id
        END AS peer_id,
        -- Get the peer's alias
        CASE 
          WHEN cc.participant_one_id = $1 THEN sp2.anonymous_alias
          ELSE sp1.anonymous_alias
        END AS peer_alias,
        -- Get online status of the peer
        CASE 
          WHEN cc.participant_one_id = $1 THEN 
            (u2.last_seen_at > NOW() - INTERVAL '5 minutes')
          ELSE 
            (u1.last_seen_at > NOW() - INTERVAL '5 minutes')
        END AS peer_is_online,
        -- Last message preview
        (SELECT content FROM community_messages 
         WHERE conversation_id = cc.id 
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM community_messages 
         WHERE conversation_id = cc.id 
         ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        -- Unread count (messages not sent by me, not read)
        (SELECT COUNT(*) FROM community_messages 
         WHERE conversation_id = cc.id 
           AND sender_id != $1 
           AND is_read = false) AS unread_count
      FROM community_conversations cc
      JOIN users u1 ON u1.id = cc.participant_one_id
      JOIN users u2 ON u2.id = cc.participant_two_id
      JOIN student_profiles sp1 ON sp1.user_id = cc.participant_one_id
      JOIN student_profiles sp2 ON sp2.user_id = cc.participant_two_id
      WHERE cc.participant_one_id = $1 OR cc.participant_two_id = $1
      ORDER BY cc.updated_at DESC`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/community/conversations/:peerId
 * Start a new conversation with a peer, or return the existing one.
 */
const startConversation = async (req, res) => {
  const userId = req.authUser.id;
  const { peerId } = req.params;

  if (userId === peerId) {
    return res.status(400).json({ error: 'Cannot start a conversation with yourself' });
  }

  const client = await db.getClient();
  try {
    // Verify caller is a student/admin in the users table
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only students can access community features.' });
    }

    // Check if conversation already exists (in either direction)
    const existingRes = await client.query(
      `SELECT id FROM community_conversations 
       WHERE (participant_one_id = $1 AND participant_two_id = $2)
          OR (participant_one_id = $2 AND participant_two_id = $1)`,
      [userId, peerId]
    );

    if (existingRes.rows.length > 0) {
      return res.json({ conversation_id: existingRes.rows[0].id, existing: true });
    }

    // Verify the peer exists and has consent
    const peerCheck = await client.query(
      `SELECT u.id FROM users u
       JOIN user_consents uc ON uc.user_id = u.id
       WHERE u.id = $1
         AND uc.anonymous_peer_support = true`,
      [peerId]
    );

    if (peerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Peer not available for messaging' });
    }

    // Create new conversation (always store lower UUID first to prevent duplicates)
    const [p1, p2] = userId < peerId ? [userId, peerId] : [peerId, userId];
    const insertRes = await client.query(
      `INSERT INTO community_conversations (participant_one_id, participant_two_id)
       VALUES ($1, $2) RETURNING id`,
      [p1, p2]
    );

    res.status(201).json({ conversation_id: insertRes.rows[0].id, existing: false });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/community/conversations/:conversationId/messages
 * Fetch messages for a conversation. Marks unread messages as read.
 * Supports pagination via ?before=<timestamp>
 */
const getMessages = async (req, res) => {
  const userId = req.authUser.id;
  const { conversationId } = req.params;
  const { before } = req.query;
  const limit = 50;

  const client = await db.getClient();
  try {
    // Verify user is a participant
    const participantCheck = await client.query(
      `SELECT id FROM community_conversations 
       WHERE id = $1 AND (participant_one_id = $2 OR participant_two_id = $2)`,
      [conversationId, userId]
    );
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Fetch messages (newest first for pagination, reversed on frontend)
    let query = `SELECT id, sender_id, content, is_read, created_at
                 FROM community_messages
                 WHERE conversation_id = $1`;
    const params = [conversationId];

    if (before) {
      query += ` AND created_at < $2`;
      params.push(before);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const messagesRes = await client.query(query, params);

    // Mark unread messages from the other person as read
    await client.query(
      `UPDATE community_messages 
       SET is_read = true 
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [conversationId, userId]
    );

    // Reverse to chronological order for the frontend
    const messages = messagesRes.rows.reverse();

    res.json({ messages, has_more: messagesRes.rows.length === limit });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/community/conversations/:conversationId/messages
 * Send a new message. Validates sender is a participant.
 */
const sendMessage = async (req, res) => {
  const userId = req.authUser.id;
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
  }

  const client = await db.getClient();
  try {
    // Verify user is a participant
    const participantCheck = await client.query(
      `SELECT id FROM community_conversations 
       WHERE id = $1 AND (participant_one_id = $2 OR participant_two_id = $2)`,
      [conversationId, userId]
    );
    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    await client.query('BEGIN');

    // Insert the message
    const msgRes = await client.query(
      `INSERT INTO community_messages (conversation_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING id, sender_id, content, is_read, created_at`,
      [conversationId, userId, content.trim()]
    );

    // Update conversation's updated_at for sorting
    await client.query(
      `UPDATE community_conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    await client.query('COMMIT');

    res.status(201).json({ message: msgRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    client.release();
  }
};

module.exports = {
  getPeers,
  getConversations,
  startConversation,
  getMessages,
  sendMessage
};
