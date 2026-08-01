const { Pool } = require('pg');
const { chatJSON, chat } = require('../services/aiService');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });

// ─────────────────────────────────────────
// Simple in-memory rate limiter
// Max 60 insight messages per user per hour
// ─────────────────────────────────────────
const _rateMap = new Map();
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_MAX    = 60;

function checkRateLimit(userId) {
  const now = Date.now();
  // Purge expired entries
  for (const [uid, entry] of _rateMap.entries()) {
    if (now > entry.resetAt) _rateMap.delete(uid);
  }
  const entry = _rateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    _rateMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

// ─────────────────────────────────────────
// INSIGHTS SESSION PHASES
//
//  Phase 1 — Warm-up   : turns 1-4   (4 gentle open questions)
//  Phase 2 — PSS-10    : turns 5-14  (10 questions, 1 PSS dimension each)
//  Phase 3 — Follow-up : turns 15-18 (4 deeper follow-up questions)
//  Phase 4 — Open      : turns 19+   (free chat, End button unlocked)
// ─────────────────────────────────────────

const WARMUP_COUNT   = 4;
const PSS_COUNT      = 10;
const FOLLOWUP_COUNT = 4;

const WARMUP_END   = WARMUP_COUNT;                             // after turn 4
const PSS_END      = WARMUP_COUNT + PSS_COUNT;                 // after turn 14
const FOLLOWUP_END = WARMUP_COUNT + PSS_COUNT + FOLLOWUP_COUNT; // after turn 18
// turn 19+ = Phase 4 (Open)

// 10 PSS dimensions — each gets exactly 1 dedicated turn in Phase 2
const PSS_DIMENSIONS = [
  { id: 'control',           label: 'Perceived lack of control',        hint: 'Do they feel situations are beyond their control?' },
  { id: 'unpredictability',  label: 'Unpredictability of events',       hint: 'Do things feel uncertain or hard to anticipate?' },
  { id: 'overload',          label: 'Perceived overload',               hint: 'Do demands exceed their ability to cope?' },
  { id: 'nervousness',       label: 'Nervousness and stress',            hint: 'How often do they feel nervous or tense?' },
  { id: 'coping',            label: 'Ability to cope with demands',     hint: 'Can they manage current responsibilities?' },
  { id: 'confidence',        label: 'Confidence in handling problems',  hint: 'Do they feel capable of handling difficulties?' },
  { id: 'irritations',       label: 'Managing irritations',             hint: 'Can they control everyday annoyances or frustrations?' },
  { id: 'going_well',        label: 'Perceived things going well',      hint: 'Do they feel life is going as expected?' },
  { id: 'on_top',            label: 'Feeling on top of things',         hint: 'Do they feel organised and in control?' },
  { id: 'accumulation',      label: 'Accumulation of difficulties',     hint: 'Do problems feel like they are piling up?' },
];

/**
 * Builds a phase-specific system prompt for each student turn.
 * studentTurnCount: how many student messages have been sent so far (including current)
 */
function buildInsightsPrompt(studentTurnCount) {
  let phaseBlock;

  if (studentTurnCount <= WARMUP_END) {
    // ── Phase 1: Warm-up ──
    phaseBlock = `
== PHASE 1: WARM-UP — question ${studentTurnCount} of ${WARMUP_COUNT} ==
Ask one warm, open-ended question to make the student feel comfortable and heard.
Goal: build trust. Do NOT assess or score anything yet.
Examples: "How have things been going for you lately?", "What's been on your mind recently?"
Do NOT set should_end to true.`;

  } else if (studentTurnCount <= PSS_END) {
    // ── Phase 2: PSS Assessment (1 dimension per turn) ──
    const pssIndex = studentTurnCount - WARMUP_END - 1; // 0-based (0–9)
    const dim = PSS_DIMENSIONS[pssIndex];
    phaseBlock = `
== PHASE 2: PSS ASSESSMENT — dimension ${pssIndex + 1} of ${PSS_COUNT} ==
Focus dimension: "${dim.label}"
Hint: ${dim.hint}

Ask one natural, friendly question that helps you understand and internally score this dimension (0–4).
  0 = Never | 1 = Almost Never | 2 = Sometimes | 3 = Fairly Often | 4 = Very Often

IMPORTANT:
- Sound like a caring friend, NOT a questionnaire.
- Do NOT mention the dimension name or scoring.
- Do NOT set should_end to true.
- Update pss_scores.${dim.id} in your JSON once you have enough info.`;

  } else if (studentTurnCount <= FOLLOWUP_END) {
    // ── Phase 3: Follow-up ──
    const followupNum = studentTurnCount - PSS_END; // 1-based (1–4)
    phaseBlock = `
== PHASE 3: FOLLOW-UP — question ${followupNum} of ${FOLLOWUP_COUNT} ==
You have completed the PSS assessment. Now ask one deeper follow-up question.
Focus on the areas where the student showed the most stress or difficulty in Phase 2.
Be empathetic and supportive — this is about understanding them more deeply.
Do NOT set should_end to true.`;

  } else {
    // ── Phase 4: Open Session ──
    const isFirstOpenTurn = studentTurnCount === FOLLOWUP_END + 1;
    phaseBlock = `
== PHASE 4: OPEN SESSION ==
You have completed the warm-up, PSS assessment, and follow-up phases.
${isFirstOpenTurn
  ? 'Ask warmly: "Is there anything else you\'d like to share or talk about? I\'m here to listen." Let the student know they can end the session whenever they feel ready.'
  : 'Respond supportively to whatever the student shares. Be warm and present.'
}
The student now controls when to end the session (End button is visible to them).
Do NOT set should_end to true — the student will end the session manually.`;
  }

  return `You are a compassionate mental health support AI for college students on TwinSync.
${phaseBlock}

SCORING (internal only, never shown to student):
  PSS total 0-13  → distress_score 1-4  (low stress)
  PSS total 14-33 → distress_score 5-7  (moderate)
  PSS total 34-40 → distress_score 8-10 (high — flag for counselor)

RULES:
- 2-3 sentences max. Warm, empathetic, NEVER clinical.
- NEVER mention PSS, scoring, assessment, or phases to the student.
- NEVER diagnose or give medical advice.
- Always end your reply with ONE question (unless in Phase 4 and just responding).

ALWAYS return this exact JSON (no extra text):
{
  "reply": "your message here",
  "distress_score": 3,
  "pss_scores": {"control":null,"unpredictability":null,"overload":null,"nervousness":null,"coping":null,"confidence":null,"irritations":null,"going_well":null,"on_top":null,"accumulation":null},
  "pss_total": null,
  "dimensions_covered": 0,
  "should_end": false
}
(Fill pss_scores as you gather info; pss_total = sum when all 10 are scored)`;
}


// ─────────────────────────────────────────
// GET /api/insights/active
// Returns the user's active session from today + all its messages
// Returns { session_id, messages } or { session_id: null }
// ─────────────────────────────────────────
async function getActiveSession(req, res) {
  try {
    const userId = req.authUser.id;

    // Find any active session started today
    const sessionResult = await pool.query(
      `SELECT id FROM ai_sessions
       WHERE user_id = $1 AND status = 'active'
         AND started_at::date = CURRENT_DATE
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.json({ session_id: null, messages: [] });
    }

    const sessionId = sessionResult.rows[0].id;

    // Load all messages for this session in order
    const msgResult = await pool.query(
      `SELECT sender, content FROM ai_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    // Convert DB format (sender: 'ai'/'student') to frontend format (role: 'ai'/'user')
    const messages = msgResult.rows.map(m => ({
      role: m.sender === 'ai' ? 'ai' : 'user',
      content: m.content,
    }));

    res.json({ session_id: sessionId, messages });
  } catch (err) {
    console.error('getActiveSession error:', err);
    res.status(500).json({ error: 'Failed to load active session' });
  }
}

// ─────────────────────────────────────────
// POST /api/insights/start
// Creates a new session, returns AI's opening question
// Returns { session_id, reply }
// ─────────────────────────────────────────
async function startInsights(req, res) {
  try {
    const userId = req.authUser.id;

    // Create a new session record
    const sessionResult = await pool.query(
      `INSERT INTO ai_sessions (user_id, status, distress_level)
       VALUES ($1, 'active', 0) RETURNING id`,
      [userId]
    );
    const sessionId = sessionResult.rows[0].id;

    // Get AI's opening question using phase-aware prompt (turn 0 = warm-up)
    const openingPrompt = buildInsightsPrompt(0);
    const aiReply = await chatJSON(
      openingPrompt,
      [],
      'Start the conversation. Greet the student warmly and ask your first gentle open-ended question.'
    );

    // Save AI opening message
    await pool.query(
      `INSERT INTO ai_messages (session_id, sender, content)
       VALUES ($1, 'ai', $2)`,
      [sessionId, aiReply.reply]
    );

    res.json({ session_id: sessionId, reply: aiReply.reply });
  } catch (err) {
    console.error('startInsights error:', err);
    res.status(500).json({ error: 'Failed to start insights session' });
  }
}


// ─────────────────────────────────────────
// POST /api/insights/message
// Body: { session_id, message, history: [{role, content}] }
// Returns { reply, distress_score, pss_scores, pss_total, dimensions_covered, should_end }
// ─────────────────────────────────────────
async function sendInsightMessage(req, res) {
  try {
    const { session_id, message, history } = req.body;
    const userId = req.authUser.id;

    // Rate limit check
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many messages. Please wait before continuing.' });
    }

    // Security: verify session belongs to this user
    const sessionCheck = await pool.query(
      `SELECT id FROM ai_sessions WHERE id = $1 AND user_id = $2 AND status != 'completed'`,
      [session_id, userId]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Session not found or access denied.' });
    }

    const safeHistory = Array.isArray(history) ? history : [];
    const hasCurrentUserTurnInHistory =
      safeHistory.length > 0 &&
      safeHistory[safeHistory.length - 1]?.role === 'user' &&
      safeHistory[safeHistory.length - 1]?.content === message;
    const trimmedHistory = hasCurrentUserTurnInHistory ? safeHistory.slice(0, -1) : safeHistory;

    // Count student turns including the current message
    const studentTurnCount = trimmedHistory.filter(m => m.role === 'user').length + 1;

    // Build the phase-specific system prompt
    const systemPrompt = buildInsightsPrompt(studentTurnCount);

    // Format history for OpenAI-compatible API (Groq)
    const formattedHistory = trimmedHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Get AI reply with PSS scoring
    const aiReply = await chatJSON(systemPrompt, formattedHistory, message);

    // Save user message to DB
    await pool.query(
      `INSERT INTO ai_messages (session_id, sender, content) VALUES ($1, 'student', $2)`,
      [session_id, message]
    );

    // Save AI reply to DB
    await pool.query(
      `INSERT INTO ai_messages (session_id, sender, content) VALUES ($1, 'ai', $2)`,
      [session_id, aiReply.reply]
    );

    // Update distress_level in session
    await pool.query(
      `UPDATE ai_sessions SET distress_level = GREATEST(distress_level, $1) WHERE id = $2`,
      [aiReply.distress_score || 0, session_id]
    );

    // Emergency flag if distress >= 8
    if (aiReply.distress_score >= 8) {
      await pool.query(
        `UPDATE ai_sessions SET status = 'emergency_flagged' WHERE id = $1`,
        [session_id]
      );
      // Log for counselor review — TODO: trigger counselor notification when that module is built
      console.warn(
        `⚠️  EMERGENCY FLAG: session=${session_id} user=${userId} distress=${aiReply.distress_score} at ${new Date().toISOString()}`
      );
    }

    // Server-side: unlock End button once student enters Phase 4 (turn 19+)
    const showEndButton = studentTurnCount > FOLLOWUP_END;

    res.json({ ...aiReply, show_end_button: showEndButton });
  } catch (err) {
    console.error('sendInsightMessage error:', err);
    res.status(500).json({ error: 'AI message failed' });
  }
}

// ─────────────────────────────────────────
// POST /api/insights/end
// Body: { session_id, history, pss_scores, pss_total }
// Generates summary + advice based on PSS score tier
// Returns { summary, pss_total, risk_level }
// ─────────────────────────────────────────
async function endInsights(req, res) {
  try {
    const { session_id, history, pss_scores, pss_total } = req.body;
    const userId = req.authUser.id;
    const safeHistory = Array.isArray(history) ? history : [];
    const parsedPssTotal = Number(pss_total);
    const clampedPssTotal = Number.isFinite(parsedPssTotal)
      ? Math.min(40, Math.max(0, Math.round(parsedPssTotal)))
      : null;

    const sessionResult = await pool.query(
      `SELECT status FROM ai_sessions WHERE id = $1 AND user_id = $2`,
      [session_id, userId]
    );
    if (sessionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Session not found or access denied.' });
    }
    if (sessionResult.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Session already completed.' });
    }

    const conversationText = safeHistory.map(m => `${m.role}: ${m.content}`).join('\n');

    // Determine risk level internally — NEVER sent to student frontend
    let risk_level = 'low';
    if (clampedPssTotal >= 14 && clampedPssTotal <= 33) risk_level = 'moderate';
    if (clampedPssTotal >= 34) risk_level = 'high';

    const adviceContext = clampedPssTotal != null
      ? `The student's stress score is ${clampedPssTotal}/40 (${risk_level} level). Tailor your response accordingly.`
      : '';

    // Ask AI for a warm summary paragraph + actionable bullet suggestions
    const summaryPrompt = `Based on this mental health check-in conversation, provide:
1. A warm 2-sentence summary of how the student is doing.
2. Exactly 3 to 5 specific, actionable suggestions appropriate to their stress level. Each suggestion must start on a new line with a dash (-).
${adviceContext}

Conversation:
${conversationText}

Format your response EXACTLY like this (no extra text before or after):
SUMMARY: <your 2-sentence warm summary here>
SUGGESTIONS:
- <suggestion 1>
- <suggestion 2>
- <suggestion 3>

Be warm and encouraging. Do not mention scores, numbers, or risk levels.`;

    const rawResponse = await chat(
      'You are a warm mental health support AI for college students.',
      [],
      summaryPrompt
    );

    // Parse the structured response into summary + suggestions array
    let summary = rawResponse;
    let suggestions = [];
    try {
      const summaryMatch = rawResponse.match(/SUMMARY:\s*([\s\S]*?)(?=SUGGESTIONS:|$)/i);
      const suggestionsMatch = rawResponse.match(/SUGGESTIONS:\s*([\s\S]*)/i);
      if (summaryMatch) summary = summaryMatch[1].trim();
      if (suggestionsMatch) {
        suggestions = suggestionsMatch[1]
          .split('\n')
          .map(s => s.replace(/^-\s*/, '').trim())
          .filter(s => s.length > 0);
      }
    } catch (_) {
      // If parsing fails, return the full text as summary with no suggestions
      summary = rawResponse;
      suggestions = [];
    }

    // Normalise distress_level: pss_total is 0–40, distress_level column is 0–10
    const distressForDb = clampedPssTotal != null ? Math.round((clampedPssTotal / 40) * 10) : 0;

    // Save to DB — risk_level goes to backend only, never returned to frontend
    await pool.query(
      `UPDATE ai_sessions
       SET status = CASE WHEN status = 'emergency_flagged' THEN status ELSE $1 END,
           summary = $2,
           distress_level = GREATEST(COALESCE(distress_level, 0), $3),
           ended_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [risk_level === 'high' ? 'emergency_flagged' : 'completed', summary, distressForDb, session_id, userId]
    );

    // Return summary + suggestions only — NO risk_level, NO pss_total to frontend
    res.json({ summary, suggestions });
  } catch (err) {
    console.error('endInsights error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
}

// ─────────────────────────────────────────
// GET /api/insights/today-tip
// Returns today's wellness tip from daily_recommendations (generated by Check-In)
// ─────────────────────────────────────────
async function getTodayTip(req, res) {
  try {
    const userId = req.authUser.id;
    const result = await pool.query(
      `SELECT content FROM daily_recommendations
       WHERE user_id = $1 AND recommendation_date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const tip = result.rows[0]?.content || null;
    res.json({ tip });
  } catch (err) {
    console.error('getTodayTip error:', err);
    res.status(500).json({ error: 'Failed to fetch today tip' });
  }
}

// ─────────────────────────────────────────
// GET /api/insights/past
// Returns all completed sessions for the user (newest first)
// Each session includes: id, started_at, ended_at, summary, messages[]
// ─────────────────────────────────────────
async function getPastSessions(req, res) {
  try {
    const userId = req.authUser.id;

    // Fetch all ended sessions (completed or emergency_flagged), newest first
    // Messages are NOT fetched here — they are loaded on-demand via /past/:sessionId
    const sessionsResult = await pool.query(
      `SELECT id, started_at, ended_at, summary
       FROM ai_sessions
       WHERE user_id = $1
         AND status IN ('completed', 'emergency_flagged')
         AND ended_at IS NOT NULL
       ORDER BY ended_at DESC`,
      [userId]
    );

    const sessions = sessionsResult.rows.map(session => ({
      id:         session.id,
      started_at: session.started_at,
      ended_at:   session.ended_at,
      summary:    session.summary || null,
    }));

    res.json({ sessions });
  } catch (err) {
    console.error('getPastSessions error:', err);
    res.status(500).json({ error: 'Failed to load past sessions' });
  }
}

// ─────────────────────────────────────────
// GET /api/insights/past/:sessionId
// Returns full message transcript for one past session
// ─────────────────────────────────────────
async function getPastSessionDetail(req, res) {
  try {
    const userId    = req.authUser.id;
    const sessionId = req.params.sessionId;

    // Verify session belongs to this user
    const sessionResult = await pool.query(
      `SELECT id, started_at, ended_at, summary
       FROM ai_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    const msgResult = await pool.query(
      `SELECT sender, content FROM ai_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );

    const messages = msgResult.rows.map(m => ({
      role:    m.sender === 'ai' ? 'ai' : 'user',
      content: m.content,
    }));

    res.json({
      id:         session.id,
      started_at: session.started_at,
      ended_at:   session.ended_at,
      summary:    session.summary || null,
      messages,
    });
  } catch (err) {
    console.error('getPastSessionDetail error:', err);
    res.status(500).json({ error: 'Failed to load session detail' });
  }
}

module.exports = { getActiveSession, startInsights, sendInsightMessage, endInsights, getTodayTip, getPastSessions, getPastSessionDetail };
