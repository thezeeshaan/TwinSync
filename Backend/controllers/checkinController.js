const { Pool } = require('pg');
const { chat, chatJSON } = require('../services/aiService');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });

// ─────────────────────────────────────────
// GET /api/checkin/lifestyle
// Returns { exists: true/false, data: {...} }
// ─────────────────────────────────────────
async function getLifestyle(req, res) {
  try {
    const userId = req.authUser.id;
    const result = await pool.query(
      'SELECT * FROM lifestyle_profiles WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }
    return res.json({ exists: true, data: result.rows[0] });
  } catch (err) {
    console.error('getLifestyle error:', err);
    res.status(500).json({ error: 'Failed to fetch lifestyle' });
  }
}

// ─────────────────────────────────────────
// POST /api/checkin/lifestyle
// Body: { dietary_pref, meals_per_day, uses_smoking, uses_tobacco, uses_alcohol,
//         sleep_hours, sleep_quality, activity_type, activity_freq }
// Saves lifestyle profile, returns { success: true }
// ─────────────────────────────────────────
async function saveLifestyle(req, res) {
  try {
    const userId = req.authUser.id;
    const {
      dietary_pref, meals_per_day, uses_smoking, uses_tobacco, uses_alcohol,
      sleep_hours, sleep_quality, activity_type, activity_freq
    } = req.body;

    await pool.query(
      `INSERT INTO lifestyle_profiles
         (user_id, dietary_pref, meals_per_day, uses_smoking, uses_tobacco, uses_alcohol,
          sleep_hours, sleep_quality, activity_type, activity_freq)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id) DO UPDATE SET
         dietary_pref  = EXCLUDED.dietary_pref,
         meals_per_day = EXCLUDED.meals_per_day,
         uses_smoking  = EXCLUDED.uses_smoking,
         uses_tobacco  = EXCLUDED.uses_tobacco,
         uses_alcohol  = EXCLUDED.uses_alcohol,
         sleep_hours   = EXCLUDED.sleep_hours,
         sleep_quality = EXCLUDED.sleep_quality,
         activity_type = EXCLUDED.activity_type,
         activity_freq = EXCLUDED.activity_freq,
         updated_at    = NOW()`,
      [userId, dietary_pref, meals_per_day, uses_smoking, uses_tobacco, uses_alcohol,
       sleep_hours, sleep_quality, activity_type, activity_freq]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('saveLifestyle error:', err);
    res.status(500).json({ error: 'Failed to save lifestyle' });
  }
}

// ─────────────────────────────────────────
// GET /api/checkin/today
// Returns { checkedInToday: bool, streak: number }
// ─────────────────────────────────────────
async function getTodayStatus(req, res) {
  try {
    const userId = req.authUser.id;

    // Check if there's already a check-in today
    const checkinResult = await pool.query(
      `SELECT id FROM check_ins
       WHERE user_id = $1 AND check_in_date = CURRENT_DATE`,
      [userId]
    );

    // Get current streak from student_profiles
    const profileResult = await pool.query(
      'SELECT current_streak FROM student_profiles WHERE user_id = $1',
      [userId]
    );

    // Return userId so frontend can use it as a localStorage key
    res.json({
      checkedInToday: checkinResult.rows.length > 0,
      streak: profileResult.rows[0]?.current_streak || 0,
      userId,
    });
  } catch (err) {
    console.error('getTodayStatus error:', err);
    res.status(500).json({ error: 'Failed to get today status' });
  }
}

// The 5 fixed daily starter questions
const STARTER_QUESTIONS = [
  "How's the day been so far?",
  "How was your sleep last night?",
  "How manageable has your day been?",
  "Have you been eating and drinking normally today?",
  "Have you had some movement or physical activity today?",
];

// ─────────────────────────────────────────
// POST /api/checkin/chat
// Body: { messages: [{role, content}], lifestyle: {...} }
// Returns { reply: string, isComplete: bool }
// ─────────────────────────────────────────
async function sendCheckinMessage(req, res) {
  try {
    const { messages, lifestyle } = req.body;

    // Count how many user messages we have so far
    const userMsgCount = messages.filter(m => m.role === 'user').length;

    // ── Phase 1: Starter questions (first 5 answers) ──
    if (userMsgCount < 5) {
      const nextQuestion = STARTER_QUESTIONS[userMsgCount];
      return res.json({ reply: nextQuestion, isComplete: false });
    }

    // ── Phase 2: Adaptive follow-ups ──
    // The first 10 messages are the 5 starter Q&A pairs.
    // Everything after index 9 is the adaptive follow-up conversation.
    const STARTER_MSG_COUNT = 10; // 5 AI questions + 5 user answers
    const adaptiveMsgs = messages.slice(STARTER_MSG_COUNT);
    const adaptiveAICount = adaptiveMsgs.filter(m => m.role === 'ai').length;

    // Build history from adaptive messages only (not the starters)
    const history = adaptiveMsgs.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Recap of starter answers for AI context
    const starterRecap = messages.slice(0, STARTER_MSG_COUNT)
      .filter(m => m.role === 'user')
      .map((m, i) => `Q${i+1}: ${STARTER_QUESTIONS[i]} → "${m.content}"`)
      .join('\n');

    // Exactly 3 adaptive follow-ups required before closing
    const REQUIRED_FOLLOWUPS = 3;
    const remaining = REQUIRED_FOLLOWUPS - adaptiveAICount;

    let instruction;
    if (remaining > 0) {
      instruction = `You MUST ask adaptive follow-up question number ${adaptiveAICount + 1} of ${REQUIRED_FOLLOWUPS}. Do NOT set isComplete to true. ${remaining === 1 ? 'This is your LAST follow-up question before closing.' : `You have ${remaining} more follow-up questions to ask after this.`} Ask about something specific from the student's answers above.`;
    } else {
      instruction = `You have completed all ${REQUIRED_FOLLOWUPS} follow-up questions. Now send a warm closing message (e.g. "Thanks so much for sharing today! I'm generating your personalised wellness tip now...") and set isComplete to true.`;
    }

    const systemPrompt = `You are a warm, supportive daily check-in assistant for a college mental health app called TwinSync.

Student lifestyle context:
- Diet: ${lifestyle?.dietary_pref || 'unknown'}, ${lifestyle?.meals_per_day || '?'} meals/day
- Sleep: ${lifestyle?.sleep_hours || 'unknown'} hours, quality: ${lifestyle?.sleep_quality || 'unknown'}
- Physical activity: ${lifestyle?.activity_type?.join(', ') || 'unknown'} — ${lifestyle?.activity_freq || 'unknown'}
- Smoking: ${lifestyle?.uses_smoking ? 'yes' : 'no'}, Tobacco: ${lifestyle?.uses_tobacco ? 'yes' : 'no'}, Alcohol: ${lifestyle?.uses_alcohol ? 'yes' : 'no'}

The student answered 5 daily check-in questions:
${starterRecap}

ADAPTIVE FOLLOW-UP PHASE — question ${adaptiveAICount + 1} of ${REQUIRED_FOLLOWUPS}:
${instruction}

Rules:
- 1-2 sentences max per response.
- Warm and conversational, never clinical.
- Do NOT repeat any question already asked.

IMPORTANT: Reply ONLY in this exact JSON format:
{"reply": "your message here", "isComplete": false}`;

    const lastUserMsg = messages[messages.length - 1].content;
    const aiReply = await chatJSON(systemPrompt, history, lastUserMsg);
    return res.json(aiReply);

  } catch (err) {
    console.error('sendCheckinMessage error:', err);
    res.status(500).json({ error: 'AI chat failed' });
  }
}


// ─────────────────────────────────────────
// POST /api/checkin/complete
// Body: { messages: [{role, content}] }
// Saves check-in, generates AI advice, updates streak
// Returns { advice: string, streak: number }
// ─────────────────────────────────────────
async function completeCheckin(req, res) {
  try {
    const userId = req.authUser.id;
    const { messages } = req.body;

    // Guard: if already saved today, return the existing saved tip — no new AI call
    const existing = await pool.query(
      `SELECT id FROM check_ins WHERE user_id = $1 AND check_in_date = CURRENT_DATE`,
      [userId]
    );
    if (existing.rows.length > 0) {
      const savedTip = await pool.query(
        `SELECT content FROM daily_recommendations
         WHERE user_id = $1 AND recommendation_date = CURRENT_DATE
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      const streakResult = await pool.query(
        'SELECT current_streak FROM student_profiles WHERE user_id = $1', [userId]
      );
      return res.json({
        advice: savedTip.rows[0]?.content || 'Keep it up — you\'re doing great!',
        streak: streakResult.rows[0]?.current_streak || 1,
      });
    }

    // Build full conversation text for the AI tip prompt
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const tipPrompt = `Based on this check-in conversation, write a single personalized wellness tip in 2-3 sentences. Be warm and encouraging. Do not use bullet points.\n\nConversation:\n${conversationText}`;

    // Generate the wellness tip
    const advice = await chat('You are a supportive mental health assistant.', [], tipPrompt);

    // Extract questions and responses from the message array
    const questions = messages.filter(m => m.role === 'ai').map(m => m.content).join(' | ');
    const responses = messages.filter(m => m.role === 'user').map(m => m.content).join(' | ');

    // ── Wrap DB writes in a transaction so a crash never leaves data inconsistent ──
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Save check-in to DB
      const checkinResult = await client.query(
        `INSERT INTO check_ins (user_id, question, response, mood_score, check_in_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)
         RETURNING id`,
        [userId, questions, responses, null]  // mood_score = null (not hardcoded)
      );
      const checkinId = checkinResult.rows[0].id;

      // Save daily recommendation
      await client.query(
        `INSERT INTO daily_recommendations (user_id, check_in_id, content, category, recommendation_date)
         VALUES ($1, $2, $3, 'wellness', CURRENT_DATE)`,
        [userId, checkinId, advice]
      );

      // Update streak atomically
      await client.query(
        `UPDATE student_profiles
         SET current_streak = current_streak + 1,
             longest_streak = GREATEST(longest_streak, current_streak + 1)
         WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // Return updated streak
    const streakResult = await pool.query(
      'SELECT current_streak FROM student_profiles WHERE user_id = $1',
      [userId]
    );

    res.json({ advice, streak: streakResult.rows[0]?.current_streak || 1 });
  } catch (err) {
    console.error('completeCheckin error:', err);
    res.status(500).json({ error: 'Failed to complete check-in' });
  }
}

module.exports = { getLifestyle, saveLifestyle, getTodayStatus, sendCheckinMessage, completeCheckin };
