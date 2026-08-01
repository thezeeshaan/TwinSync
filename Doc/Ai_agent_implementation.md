# AI Feature Implementation Guide — TwinSync
## Check-In & Insights (Pillar 1 & 2)

> **Purpose of this document:** A complete, self-contained guide. Any developer who reads this from top to bottom will know exactly which files to create, which to modify, what code to write, and why — without needing to ask anyone.

---

## 1. What We Are Building

Two AI-powered chat pages:

| Feature | What it does |
|---|---|
| **Check In** | Daily mental wellness check-in. AI asks 5 fixed questions + adaptive follow-ups. Ends with a personalized tip. Tracks streaks. |
| **Insights** | Open-ended AI conversation that assesses the student across **10 PSS dimensions** (Perceived Stress Scale) through natural chat. After a warm-up phase, Gemini systematically explores all 10 dimensions, scores each 0–4, computes a total stress score (0–40), and provides personalized advice or flags distress. |

**Shared gate (for both):** Before either chat opens, the app checks if the user has filled their **lifestyle profile** (diet, sleep, activity etc.). If not, a tap-only onboarding modal appears first. Fill it once → never see it again.

---

## 2. Tech Stack Used

| Layer | Technology |
|---|---|
| Frontend | React + Vite (JSX), Semantic UI React |
| Backend | Node.js + Express (CommonJS) |
| Database | PostgreSQL via Supabase |
| AI | Google Gemini API (`@google/generative-ai` npm package) |
| Auth | Supabase JWT (`verifySupabaseToken` middleware already exists) |

---

## 3. Prerequisites

Before implementing, make sure these are in `Backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get it free from: https://aistudio.google.com → Get API Key → Create API Key

Also install the Gemini package in the Backend:
```bash
cd Backend
npm install @google/generative-ai
```

---

## 4. Full File Structure

Below is the COMPLETE map of every file that will be **created (NEW)** or **modified (EDIT)**. Files marked with nothing are existing and untouched.

```
TwinSync/
├── Backend/
│   ├── index.js                                  ← EDIT (register new routes)
│   ├── package.json                              ← EDIT (add @google/generative-ai)
│   ├── .env                                      ← EDIT (add GEMINI_API_KEY)
│   ├── migration/
│   │   └── 021_create_lifestyle_profiles.sql     ← NEW (DB table for lifestyle data)
│   ├── routes/
│   │   ├── authRoutes.js                         (untouched)
│   │   ├── checkinRoutes.js                      ← NEW (all check-in API endpoints)
│   │   └── insightsRoutes.js                     ← NEW (all insights API endpoints)
│   ├── controllers/
│   │   ├── authController.js                     (untouched)
│   │   ├── checkinController.js                  ← NEW (business logic for check-in)
│   │   └── insightsController.js                 ← NEW (business logic for insights)
│   ├── services/
│   │   └── geminiService.js                      ← NEW (shared Gemini AI helper)
│   └── middleware/
│       └── verifySupabaseToken.js                (untouched — already works)
│
└── Frontend/
    └── src/
        ├── App.jsx                               ← EDIT (add /checkin and /insights routes)
        ├── components/
        │   ├── Navbar.jsx                        ← EDIT (update "Check In" link to /checkin)
        │   └── LifestyleModal.jsx                ← NEW (tap-based lifestyle onboarding)
        ├── pages/
        │   ├── CheckIn.jsx                       ← NEW (check-in chat page)
        │   └── Insights.jsx                      ← NEW (insights chat page)
        └── services/
            └── api.js                            ← NEW (API call helper functions)
```

---

## 5. Database Migration

### File: `Backend/migration/021_create_lifestyle_profiles.sql`

**What it does:** Creates a new table that stores each user's lifestyle info (diet, sleep, activity). One row per user. Only created once.

```sql
CREATE TABLE IF NOT EXISTS lifestyle_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dietary_pref  TEXT,            -- "vegetarian", "vegan", "non-veg"
  meals_per_day INT,             -- 1, 2, 3, or 4
  uses_tobacco  BOOLEAN DEFAULT false,
  uses_smoking  BOOLEAN DEFAULT false,
  uses_alcohol  BOOLEAN DEFAULT false,
  sleep_hours   TEXT,            -- "<5", "5-6", "6-7", "7-8", "8+"
  sleep_quality TEXT,            -- "poor", "okay", "good"
  activity_type TEXT[],          -- array e.g. ["gym", "walking"]
  activity_freq TEXT,            -- "daily", "3-4x/week", "1-2x/week", "rarely"
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**How it runs:** The existing `Backend/config/migrate.js` file automatically reads and runs all `.sql` files in the `migration/` folder on server startup. No manual step needed — just restart the backend.

---

## 6. Backend — New Package

### File: `Backend/package.json` (EDIT)

Add `@google/generative-ai` to the dependencies object:

```json
"dependencies": {
  "@supabase/supabase-js": "^2.111.0",
  "@google/generative-ai": "^0.21.0",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2",
  "express": "^5.2.1",
  "pg": "^8.22.0"
}
```

Then run in terminal: `cd Backend && npm install`

---

## 7. Backend — Gemini Service

### File: `Backend/services/geminiService.js` (NEW)

**What it does:** A shared helper module. Both checkinController and insightsController import this to talk to the Gemini API. Keeps Gemini setup in one place.

```js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Send a prompt to Gemini and get a plain text reply.
 * @param {string} systemPrompt - Instructions for Gemini's behavior
 * @param {Array}  history      - Array of {role, parts} for conversation history
 * @param {string} userMessage  - The latest user message
 * @returns {Promise<string>}   - Gemini's text reply
 */
async function chat(systemPrompt, history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });

  const chatSession = model.startChat({ history });
  const result = await chatSession.sendMessage(userMessage);
  return result.response.text();
}

/**
 * Send a prompt and get a JSON reply.
 * Gemini is told to return JSON. We parse and return it.
 * @param {string} systemPrompt
 * @param {Array}  history
 * @param {string} userMessage
 * @returns {Promise<Object>}
 */
async function chatJSON(systemPrompt, history, userMessage) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const chatSession = model.startChat({ history });
  const result = await chatSession.sendMessage(userMessage);
  const text = result.response.text();
  return JSON.parse(text);
}

module.exports = { chat, chatJSON };
```

---

## 8. Backend — Check-In Routes

### File: `Backend/routes/checkinRoutes.js` (NEW)

**What it does:** Defines all HTTP endpoints for the Check-In feature. All routes require a valid JWT token (using existing `verifySupabaseToken` middleware).

```js
const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  getLifestyle,
  saveLifestyle,
  getTodayStatus,
  sendCheckinMessage,
  completeCheckin,
} = require('../controllers/checkinController');

// All routes are protected
router.get('/lifestyle',   verifySupabaseToken, getLifestyle);      // Check if lifestyle exists
router.post('/lifestyle',  verifySupabaseToken, saveLifestyle);     // Save lifestyle profile
router.get('/today',       verifySupabaseToken, getTodayStatus);    // Already checked in today?
router.post('/chat',       verifySupabaseToken, sendCheckinMessage); // Send msg → get AI reply
router.post('/complete',   verifySupabaseToken, completeCheckin);   // Save session summary

module.exports = router;
```

---

## 9. Backend — Check-In Controller

### File: `Backend/controllers/checkinController.js` (NEW)

**What it does:** Contains all the business logic for Check-In. Reads from/writes to the database, calls Gemini, and returns responses to the frontend.

```js
const { Pool } = require('pg');
const { chat } = require('../services/geminiService');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });

// ─────────────────────────────────────────
// GET /api/checkin/lifestyle
// Returns { exists: true/false, data: {...} }
// ─────────────────────────────────────────
async function getLifestyle(req, res) {
  try {
    const userId = req.user.id; // set by verifySupabaseToken middleware
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
// Body: { dietary_pref, meals_per_day, uses_tobacco, uses_alcohol,
//         sleep_hours, sleep_quality, activity_type, activity_freq }
// Saves lifestyle profile, returns { success: true }
// ─────────────────────────────────────────
async function saveLifestyle(req, res) {
  try {
    const userId = req.user.id;
    const {
      dietary_pref, meals_per_day, uses_tobacco, uses_alcohol,
      sleep_hours, sleep_quality, activity_type, activity_freq
    } = req.body;

    await pool.query(
      `INSERT INTO lifestyle_profiles
         (user_id, dietary_pref, meals_per_day, uses_tobacco, uses_alcohol,
          sleep_hours, sleep_quality, activity_type, activity_freq)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id) DO UPDATE SET
         dietary_pref  = EXCLUDED.dietary_pref,
         meals_per_day = EXCLUDED.meals_per_day,
         uses_tobacco  = EXCLUDED.uses_tobacco,
         uses_alcohol  = EXCLUDED.uses_alcohol,
         sleep_hours   = EXCLUDED.sleep_hours,
         sleep_quality = EXCLUDED.sleep_quality,
         activity_type = EXCLUDED.activity_type,
         activity_freq = EXCLUDED.activity_freq,
         updated_at    = NOW()`,
      [userId, dietary_pref, meals_per_day, uses_tobacco, uses_alcohol,
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
    const userId = req.user.id;

    // Check if there's already a check-in today
    const checkinResult = await pool.query(
      `SELECT id FROM check_ins
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
      [userId]
    );

    // Get current streak from student_profiles
    const profileResult = await pool.query(
      'SELECT current_streak FROM student_profiles WHERE user_id = $1',
      [userId]
    );

    res.json({
      checkedInToday: checkinResult.rows.length > 0,
      streak: profileResult.rows[0]?.current_streak || 0,
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

    // If still in starter questions phase (first 5 answers)
    if (userMsgCount < 5) {
      // Return the next fixed question
      const nextQuestion = STARTER_QUESTIONS[userMsgCount];
      return res.json({ reply: nextQuestion, isComplete: false });
    }

    // After 5 answers — Gemini takes over for adaptive follow-ups
    // Build conversation history for Gemini format
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemPrompt = `You are a warm, supportive daily check-in assistant for a college mental health app called TwinSync.
You have the following lifestyle context about this student:
- Diet: ${lifestyle.dietary_pref}, ${lifestyle.meals_per_day} meals/day
- Sleep: ${lifestyle.sleep_hours} hours, quality: ${lifestyle.sleep_quality}
- Physical activity: ${lifestyle.activity_type?.join(', ')} — ${lifestyle.activity_freq}
- Tobacco: ${lifestyle.uses_tobacco ? 'yes' : 'no'}, Alcohol: ${lifestyle.uses_alcohol ? 'yes' : 'no'}

The student has just answered 5 daily check-in questions. Now ask 2-3 short adaptive follow-up questions based on their answers.
Keep each response to 1-2 sentences max. Be warm and conversational, not clinical.
After 3 adaptive follow-ups, say something like: "Thanks for sharing! Generating your wellness tip now..." and set isComplete to true.

IMPORTANT: Reply in this JSON format:
{"reply": "your message here", "isComplete": false}`;

    const lastUserMsg = messages[messages.length - 1].content;
    const geminiReply = await chat(systemPrompt, history, lastUserMsg);

    // Try to parse JSON, fallback if Gemini doesn't return proper JSON
    try {
      const parsed = JSON.parse(geminiReply);
      return res.json(parsed);
    } catch {
      return res.json({ reply: geminiReply, isComplete: false });
    }

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
    const userId = req.user.id;
    const { messages } = req.body;

    // Build a summary string from the conversation
    const summary = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    // Ask Gemini for a personalized wellness tip
    const tipPrompt = `Based on this check-in conversation, write a single personalized wellness tip in 2-3 sentences. Be warm and encouraging. Do not use bullet points.\n\nConversation:\n${summary}`;
    const advice = await chat('You are a supportive mental health assistant.', [], tipPrompt);

    // Save check-in to DB
    await pool.query(
      `INSERT INTO check_ins (user_id, mood_score, summary, notes)
       VALUES ($1, $2, $3, $4)`,
      [userId, 5, summary, '']
    );

    // Save daily recommendation
    await pool.query(
      `INSERT INTO daily_recommendations (user_id, recommendation_text, recommendation_type)
       VALUES ($1, $2, 'wellness')`,
      [userId, advice]
    );

    // Update streak in student_profiles
    await pool.query(
      `UPDATE student_profiles
       SET current_streak = current_streak + 1,
           longest_streak = GREATEST(longest_streak, current_streak + 1)
       WHERE user_id = $1`,
      [userId]
    );

    // Get updated streak
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
```

---

## 10. Backend — Insights Routes

### File: `Backend/routes/insightsRoutes.js` (NEW)

**What it does:** Defines all HTTP endpoints for the Insights feature.

```js
const express = require('express');
const router = express.Router();
const { verifySupabaseToken } = require('../middleware/verifySupabaseToken');
const {
  startInsights,
  sendInsightMessage,
  endInsights,
} = require('../controllers/insightsController');

router.post('/start',    verifySupabaseToken, startInsights);        // Start a new session
router.post('/message',  verifySupabaseToken, sendInsightMessage);   // Chat message
router.post('/end',      verifySupabaseToken, endInsights);          // End session, get summary

module.exports = router;
```

---

## 11. Backend — Insights Controller

### File: `Backend/controllers/insightsController.js` (NEW)

**What it does:** Manages the AI conversation in two phases:
- **Phase 1 (Warm-up):** First 2–3 exchanges — light, open-ended surface questions so the student feels comfortable.
- **Phase 2 (PSS-10 Assessment):** After warm-up, Gemini systematically explores all 10 Perceived Stress Scale dimensions through natural conversational questions. Each dimension is scored 0–4. Total score (0–40) determines advice tier.

**PSS-10 Dimensions Gemini Must Cover:**
```
1.  Perceived lack of control     — Feeling important situations are beyond one's control
2.  Unpredictability of events    — Things feel unexpected, uncertain, hard to anticipate
3.  Perceived overload            — Demands exceed ability to cope
4.  Nervousness and stress        — Frequency/intensity of feeling nervous, tense, stressed
5.  Ability to cope with demands  — Perception of managing current responsibilities
6.  Confidence in handling problems — Feeling capable of dealing with personal difficulties
7.  Managing irritations          — Ability to control everyday annoyances and frustrations
8.  Perceived things going well   — Whether things are going according to expectations
9.  Feeling on top of things      — Sense of being organized and in control
10. Accumulation of difficulties  — Feeling problems are building up uncontrollably
```

**PSS-10 Scoring Tiers:**
```
Total Score 0–13   → Low stress       → Positive reinforcement + maintenance tips
Total Score 14–33  → Moderate stress  → Coping strategies + lifestyle suggestions
Total Score 34–40  → High stress      → Strong coping advice + counselor recommendation
                                         + flag session as emergency_flagged in DB
```

```js
const { Pool } = require('pg');
const { chatJSON, chat } = require('../services/geminiService');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });

const INSIGHTS_SYSTEM_PROMPT = `You are a compassionate mental health support AI for college students on TwinSync.

YOU HAVE TWO PHASES:

== PHASE 1: WARM-UP (first 2-3 exchanges) ==
Ask open, gentle surface-level questions. Goal: make the student feel comfortable.
Examples: "How have things been feeling lately?", "What's been on your mind?"

== PHASE 2: PSS-10 ASSESSMENT (after warm-up) ==
You must naturally explore ALL 10 of these psychological dimensions through conversation.
Do NOT ask them as a list or survey. Weave them into the chat like a caring friend would.
For each dimension, internally score the student 0-4:
  0 = Never  1 = Almost Never  2 = Sometimes  3 = Fairly Often  4 = Very Often

The 10 dimensions to cover:
1.  Perceived lack of control     — Do they feel situations are beyond their control?
2.  Unpredictability of events    — Do things feel uncertain or hard to anticipate?
3.  Perceived overload            — Do demands exceed their ability to cope?
4.  Nervousness and stress        — How often do they feel nervous, tense, or stressed?
5.  Ability to cope with demands  — Can they manage current responsibilities?
6.  Confidence in handling problems — Do they feel capable of handling difficulties?
7.  Managing irritations          — Can they control everyday annoyances/frustrations?
8.  Perceived things going well   — Do they feel things are going as expected?
9.  Feeling on top of things      — Do they feel organized and in control?
10. Accumulation of difficulties  — Do problems feel like they are piling up?

Once you have explored enough to score all 10 dimensions (typically 6-10 conversation turns):
- Compute total_pss_score = sum of all 10 scores (range: 0-40)
- Set should_end = true in your JSON response
- Give a warm closing message appropriate to their score tier

SCORING TIERS (for distress_score field, map PSS to 1-10 scale):
  PSS 0-13  → distress_score 1-4  → Continue normally, give positive tips
  PSS 14-33 → distress_score 5-7  → Introduce coping strategies
  PSS 34-40 → distress_score 8-10 → Recommend counselor strongly

RULES:
- Max 2-3 sentences per reply. Be warm, empathetic, NOT clinical.
- NEVER say "I am assessing you" or mention PSS or scoring.
- NEVER diagnose. NEVER give medical advice.
- Cover dimensions naturally — one or two per conversational exchange.
- ALWAYS return JSON in this exact format:
  {
    "reply": "your message here",
    "distress_score": 3,
    "pss_scores": {"control": 2, "unpredictability": 1, "overload": 3, "nervousness": 2, "coping": 2, "confidence": 1, "irritations": 1, "going_well": 2, "on_top": 1, "accumulation": 2},
    "pss_total": 17,
    "dimensions_covered": 6,
    "should_end": false
  }
  (pss_scores and pss_total are null until you have enough data to score)`;`

// ─────────────────────────────────────────
// POST /api/insights/start
// Creates a new session, returns Gemini's opening question
// Returns { session_id, reply }
// ─────────────────────────────────────────
async function startInsights(req, res) {
  try {
    const userId = req.user.id;

    // Create a new session record
    const sessionResult = await pool.query(
      `INSERT INTO ai_sessions (user_id, status, distress_level)
       VALUES ($1, 'active', 0) RETURNING id`,
      [userId]
    );
    const sessionId = sessionResult.rows[0].id;

    // Get Gemini's opening question
    const geminiReply = await chatJSON(
      INSIGHTS_SYSTEM_PROMPT,
      [],
      'Start the conversation. Greet the student warmly and ask your first gentle open-ended question.'
    );

    // Save AI opening message to ai_messages
    await pool.query(
      `INSERT INTO ai_messages (session_id, role, content)
       VALUES ($1, 'assistant', $2)`,
      [sessionId, geminiReply.reply]
    );

    res.json({ session_id: sessionId, reply: geminiReply.reply });
  } catch (err) {
    console.error('startInsights error:', err);
    res.status(500).json({ error: 'Failed to start insights session' });
  }
}

// ─────────────────────────────────────────
// POST /api/insights/message
// Body: { session_id, message, history: [{role, content}] }
// Returns { reply, distress_score, should_end }
// ─────────────────────────────────────────
async function sendInsightMessage(req, res) {
  try {
    const { session_id, message, history } = req.body;

    // Format history for Gemini
    const geminiHistory = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Get Gemini's reply with distress score
    const geminiReply = await chatJSON(INSIGHTS_SYSTEM_PROMPT, geminiHistory, message);

    // Save user message to DB
    await pool.query(
      `INSERT INTO ai_messages (session_id, role, content) VALUES ($1, 'user', $2)`,
      [session_id, message]
    );

    // Save AI reply to DB
    await pool.query(
      `INSERT INTO ai_messages (session_id, role, content) VALUES ($1, 'assistant', $2)`,
      [session_id, geminiReply.reply]
    );

    // Update distress_level in session if score is higher
    await pool.query(
      `UPDATE ai_sessions SET distress_level = GREATEST(distress_level, $1) WHERE id = $2`,
      [geminiReply.distress_score, session_id]
    );

    // If distress >= 8 mark as emergency
    if (geminiReply.distress_score >= 8) {
      await pool.query(
        `UPDATE ai_sessions SET status = 'emergency_flagged' WHERE id = $1`,
        [session_id]
      );
    }

    res.json(geminiReply);
  } catch (err) {
    console.error('sendInsightMessage error:', err);
    res.status(500).json({ error: 'AI message failed' });
  }
}

// ─────────────────────────────────────────
// POST /api/insights/end
// Body: { session_id, history, pss_scores, pss_total }
// Generates summary + advice based on PSS score tier
// Returns { summary, pss_total, risk_level, advice }
// ─────────────────────────────────────────
async function endInsights(req, res) {
  try {
    const { session_id, history, pss_scores, pss_total } = req.body;

    const conversationText = history.map(m => `${m.role}: ${m.content}`).join('\n');

    // Determine risk level from PSS total
    let risk_level = 'low';
    if (pss_total >= 14 && pss_total <= 33) risk_level = 'moderate';
    if (pss_total >= 34) risk_level = 'high';

    // Build advice prompt based on PSS score tier
    const adviceContext = pss_total !== null
      ? `The student's total PSS-10 score is ${pss_total}/40 (${risk_level} stress level).`
      : '';

    // Ask Gemini for a personalized summary + advice
    const summaryPrompt = `Based on this mental health check-in conversation, write:
1. A warm 2-sentence summary of how the student is doing.
2. Two specific, actionable suggestions appropriate to their stress level.
${adviceContext}

Conversation:\n${conversationText}\n\nWrite now. Be warm and encouraging.`;

    const summary = await chat(
      'You are a warm mental health support AI for college students.',
      [],
      summaryPrompt
    );

    // Mark session as completed with PSS data stored in summary JSONB or notes
    await pool.query(
      `UPDATE ai_sessions
       SET status = $1, summary = $2, distress_level = $3
       WHERE id = $4`,
      [risk_level === 'high' ? 'emergency_flagged' : 'completed', summary, pss_total || 0, session_id]
    );

    res.json({ summary, pss_total, risk_level });
  } catch (err) {
    console.error('endInsights error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
}

module.exports = { startInsights, sendInsightMessage, endInsights };
```

---

## 12. Backend — Register New Routes

### File: `Backend/index.js` (EDIT)

**What to change:** Replace the two placeholder lines for `/api/checkin` and `/api/insights` with the real routes.

Find these lines (around line 37–44):
```js
const authRoutes = require('./routes/authRoutes');

// Setup endpoint structure for our 4 pillars
app.use('/api/auth', authRoutes);
app.use('/api/checkin', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/insights', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/counselor', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/community', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
```

Replace with:
```js
const authRoutes    = require('./routes/authRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const insightsRoutes = require('./routes/insightsRoutes');

app.use('/api/auth',      authRoutes);
app.use('/api/checkin',   checkinRoutes);
app.use('/api/insights',  insightsRoutes);
app.use('/api/counselor', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
app.use('/api/community', (req, res) => res.status(501).json({ error: 'Not implemented yet' }));
```

---

## 13. Frontend — API Service

### File: `Frontend/src/services/api.js` (NEW)

**What it does:** A single file with all the functions that call backend APIs. Components import from here — they never write `fetch()` directly. Makes it easy to change the backend URL in one place.

```js
const BASE = import.meta.env.VITE_API_URL; // e.g. http://localhost:5000

// Helper: gets the current user's JWT token from Supabase session
async function getAuthHeader() {
  // Import supabase client
  const { supabase } = await import('../config/supabaseClient');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Lifestyle ─────────────────────────────────────

/** Check if this user has a lifestyle profile saved */
export async function getLifestyle() {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/checkin/lifestyle`, { headers });
  return res.json(); // { exists: bool, data: {...} }
}

/** Save the lifestyle form data */
export async function saveLifestyle(data) {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/checkin/lifestyle`, {
    method: 'POST', headers, body: JSON.stringify(data),
  });
  return res.json();
}

// ── Check-In ──────────────────────────────────────

/** Check if already checked in today + get streak */
export async function getTodayStatus() {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/checkin/today`, { headers });
  return res.json(); // { checkedInToday: bool, streak: number }
}

/** Send a message in the check-in chat */
export async function sendCheckinMessage(messages, lifestyle) {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/checkin/chat`, {
    method: 'POST', headers, body: JSON.stringify({ messages, lifestyle }),
  });
  return res.json(); // { reply: string, isComplete: bool }
}

/** Complete the check-in session and get the wellness tip */
export async function completeCheckin(messages) {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/checkin/complete`, {
    method: 'POST', headers, body: JSON.stringify({ messages }),
  });
  return res.json(); // { advice: string, streak: number }
}

// ── Insights ──────────────────────────────────────

/** Start an Insights session */
export async function startInsights() {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/insights/start`, { method: 'POST', headers });
  return res.json(); // { session_id, reply }
}

/** Send a message in the Insights chat */
export async function sendInsightMessage(session_id, message, history) {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/insights/message`, {
    method: 'POST', headers, body: JSON.stringify({ session_id, message, history }),
  });
  return res.json(); // { reply, distress_score, should_end }
}

/** End the Insights session */
export async function endInsights(session_id, history) {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/api/insights/end`, {
    method: 'POST', headers, body: JSON.stringify({ session_id, history }),
  });
  return res.json(); // { summary }
}
```

---

## 14. Frontend — Lifestyle Modal Component

### File: `Frontend/src/components/LifestyleModal.jsx` (NEW)

**What it does:** A fullscreen modal with tap-only buttons. Zero typing required. Used by both CheckIn and Insights pages. When the user fills all sections and clicks "Continue", it saves to the DB and calls `onComplete()` so the parent page can open the chat.

```jsx
import React, { useState } from 'react';
import { saveLifestyle } from '../services/api';

// Pill button style — highlighted when selected
const PillBtn = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.5rem 1.1rem',
      margin: '0.25rem',
      borderRadius: '999px',
      border: `2px solid ${selected ? '#0ea5e9' : '#cbd5e1'}`,
      background: selected ? '#0ea5e9' : 'transparent',
      color: selected ? '#fff' : 'var(--text-primary)',
      cursor: 'pointer',
      fontWeight: selected ? '600' : '400',
      transition: 'all 0.2s',
    }}
  >
    {label}
  </button>
);

function LifestyleModal({ onComplete }) {
  const [form, setForm] = useState({
    dietary_pref: null,
    meals_per_day: null,
    uses_smoking: null,
    uses_tobacco: null,
    uses_alcohol: null,
    sleep_hours: null,
    sleep_quality: null,
    activity_type: [],       // multi-select
    activity_freq: null,
  });
  const [loading, setLoading] = useState(false);

  // For single-select fields
  const select = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // For multi-select (activity_type)
  const toggleActivity = (val) => {
    setForm(f => {
      const current = f.activity_type;
      return {
        ...f,
        activity_type: current.includes(val)
          ? current.filter(v => v !== val)
          : [...current, val],
      };
    });
  };

  // Enable "Continue" only when all fields are filled
  const isComplete = (
    form.dietary_pref && form.meals_per_day && form.uses_smoking !== null &&
    form.uses_tobacco !== null && form.uses_alcohol !== null &&
    form.sleep_hours && form.sleep_quality &&
    form.activity_type.length > 0 && form.activity_freq
  );

  const handleSubmit = async () => {
    if (!isComplete) return;
    setLoading(true);
    try {
      await saveLifestyle(form);
      onComplete(form); // tell parent: done, here is the lifestyle data
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.1rem' }}>
        {children}
      </div>
    </div>
  );

  return (
    // Backdrop
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      {/* Modal card */}
      <div style={{
        background: 'var(--bg-primary)', borderRadius: '20px',
        padding: '2rem', maxWidth: '520px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👋 Quick Setup</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Takes 30 seconds — helps us personalize your experience
        </p>

        <Section title="Diet Preference">
          {['🌿 Vegetarian','🥩 Non-Veg','🌱 Vegan','🍳 Eggetarian'].map(v => (
            <PillBtn key={v} label={v} selected={form.dietary_pref === v} onClick={() => select('dietary_pref', v)} />
          ))}
        </Section>

        <Section title="Meals per Day">
          {['1','2','3','4+'].map(v => (
            <PillBtn key={v} label={v} selected={form.meals_per_day === v} onClick={() => select('meals_per_day', v)} />
          ))}
        </Section>

        <Section title="Smoking?">
          {['Yes','No'].map(v => (
            <PillBtn key={v} label={v} selected={form.uses_smoking === (v === 'Yes')} onClick={() => select('uses_smoking', v === 'Yes')} />
          ))}
        </Section>

        <Section title="Tobacco use?">
          {['Yes','No'].map(v => (
            <PillBtn key={v} label={v} selected={form.uses_tobacco === (v === 'Yes')} onClick={() => select('uses_tobacco', v === 'Yes')} />
          ))}
        </Section>

        <Section title="Alcohol use?">
          {['Yes','No'].map(v => (
            <PillBtn key={v} label={v} selected={form.uses_alcohol === (v === 'Yes')} onClick={() => select('uses_alcohol', v === 'Yes')} />
          ))}
        </Section>

        <Section title="Sleep (hours/night)">
          {['Less than 5','5–6 hrs','6–7 hrs','7–8 hrs','8+ hrs'].map(v => (
            <PillBtn key={v} label={v} selected={form.sleep_hours === v} onClick={() => select('sleep_hours', v)} />
          ))}
        </Section>

        <Section title="Sleep Quality">
          {['😴 Poor','😐 Okay','😊 Good'].map(v => (
            <PillBtn key={v} label={v} selected={form.sleep_quality === v} onClick={() => select('sleep_quality', v)} />
          ))}
        </Section>

        <Section title="Physical Activity (select all that apply)">
          {['🏋️ Gym','⚽ Sports','🚶 Walking','🧘 Yoga / Meditation','🚴 Cycling','❌ None'].map(v => (
            <PillBtn key={v} label={v} selected={form.activity_type.includes(v)} onClick={() => toggleActivity(v)} />
          ))}
        </Section>

        <Section title="How Often?">
          {['Daily','3–4x / week','1–2x / week','Rarely'].map(v => (
            <PillBtn key={v} label={v} selected={form.activity_freq === v} onClick={() => select('activity_freq', v)} />
          ))}
        </Section>

        <button
          onClick={handleSubmit}
          disabled={!isComplete || loading}
          style={{
            width: '100%', padding: '0.9rem',
            background: isComplete ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : '#cbd5e1',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '1rem', fontWeight: '700', cursor: isComplete ? 'pointer' : 'not-allowed',
            marginTop: '0.5rem', transition: 'all 0.2s',
          }}
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}

export default LifestyleModal;
```

---

## 15. Frontend — CheckIn Page

### File: `Frontend/src/pages/CheckIn.jsx` (NEW)

**What it does:** The full Check-In experience. On mount, checks lifestyle (shows modal if needed) and checks if already done today. Runs a chat-style conversation with quick-reply chips and free text. At the end shows a wellness tip card and updated streak.

```jsx
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LifestyleModal from '../components/LifestyleModal';
import { getLifestyle, getTodayStatus, sendCheckinMessage, completeCheckin } from '../services/api';

// Quick reply options for each of the 5 starter questions
const QUICK_REPLIES = [
  ['😊 Great', '😐 Okay', '😔 Rough', '✍️ Let me explain'],
  ['😊 Good', '😐 Average', '😔 Terrible', '✍️ Let me explain'],
  ['Very manageable', 'Somewhat', 'Barely', 'Not at all'],
  ['Yes, normally', 'Skipped a meal', 'Not really'],
  ['Yes, was active', 'A little', 'No, not today'],
];

function CheckIn() {
  const [showModal, setShowModal]   = useState(false);
  const [lifestyle, setLifestyle]   = useState(null);
  const [messages, setMessages]     = useState([]);   // [{role:'user'/'ai', content:'...'}]
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streak, setStreak]         = useState(0);
  const [adviceCard, setAdviceCard] = useState(null); // shown at end
  const [pageLoading, setPageLoading] = useState(true);
  const bottomRef = useRef(null);

  // On mount: check lifestyle + today status
  useEffect(() => {
    (async () => {
      const lifestyleRes = await getLifestyle();
      if (!lifestyleRes.exists) {
        setShowModal(true);
      } else {
        setLifestyle(lifestyleRes.data);
      }
      const todayRes = await getTodayStatus();
      setCheckedInToday(todayRes.checkedInToday);
      setStreak(todayRes.streak);
      setPageLoading(false);
    })();
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Called when lifestyle modal is completed
  const handleLifestyleComplete = async (data) => {
    setLifestyle(data);
    setShowModal(false);
    startChat(data);
  };

  // Start the check-in chat
  const startChat = async (lifestyleData) => {
    setChatStarted(true);
    setLoading(true);
    const res = await sendCheckinMessage([], lifestyleData || lifestyle);
    setMessages([{ role: 'ai', content: res.reply }]);
    setLoading(false);
  };

  // When lifestyle is already filled — start chat directly
  useEffect(() => {
    if (lifestyle && !chatStarted && !checkedInToday && !pageLoading) {
      startChat(lifestyle);
    }
  }, [lifestyle, chatStarted, checkedInToday, pageLoading]);

  // Send a message (either from chip or text input)
  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const res = await sendCheckinMessage(updatedMessages, lifestyle);

    if (res.isComplete) {
      // Get final advice card
      const completedRes = await completeCheckin(updatedMessages);
      setAdviceCard(completedRes.advice);
      setStreak(completedRes.streak);
      setMessages(m => [...m, { role: 'ai', content: res.reply }]);
    } else {
      setMessages(m => [...m, { role: 'ai', content: res.reply }]);
    }
    setLoading(false);
  };

  // How many user messages have been sent so far
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const currentChips = userMsgCount < 5 ? QUICK_REPLIES[userMsgCount] : [];

  if (pageLoading) return <><Navbar /><div style={{ marginTop: '7em', textAlign: 'center' }}>Loading...</div></>;

  return (
    <>
      <Navbar />
      {showModal && <LifestyleModal onComplete={handleLifestyleComplete} />}

      <div style={{ maxWidth: '680px', margin: '7em auto 2em', padding: '0 1rem' }}>

        {/* Streak badge */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <span style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', padding: '0.4rem 1.2rem', borderRadius: '999px',
            fontWeight: '700', fontSize: '0.9rem',
          }}>
            🔥 {streak} Day Streak
          </span>
        </div>

        {/* Already checked in today */}
        {checkedInToday && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', borderRadius: '16px', padding: '1.5rem', textAlign: 'center',
          }}>
            <h2>✅ You've already checked in today!</h2>
            <p style={{ opacity: 0.9 }}>Come back tomorrow to continue your streak.</p>
          </div>
        )}

        {/* Chat area */}
        {!checkedInToday && chatStarted && (
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: '16px',
            padding: '1rem', minHeight: '400px', maxHeight: '55vh',
            overflowY: 'auto', marginBottom: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%', padding: '0.75rem 1rem', borderRadius: '16px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #0ea5e9, #6366f1)'
                    : 'var(--bg-primary)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                  Typing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Advice card at end */}
        {adviceCard && (
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            color: '#fff', borderRadius: '16px', padding: '1.5rem',
            marginBottom: '1rem',
          }}>
            <h3 style={{ marginBottom: '0.75rem' }}>💡 Your Wellness Tip for Today</h3>
            <p style={{ lineHeight: 1.7 }}>{adviceCard}</p>
          </div>
        )}

        {/* Quick reply chips */}
        {!checkedInToday && !loading && !adviceCard && currentChips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {currentChips.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)} style={{
                padding: '0.5rem 1rem', borderRadius: '999px',
                border: '2px solid #0ea5e9', background: 'transparent',
                color: '#0ea5e9', cursor: 'pointer', fontWeight: '500',
              }}>
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        {!checkedInToday && !adviceCard && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Type your reply..."
              style={{
                flex: 1, padding: '0.8rem 1rem', borderRadius: '12px',
                border: '2px solid var(--border-color)', background: 'var(--bg-secondary)',
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.8rem 1.4rem', borderRadius: '12px',
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700',
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default CheckIn;
```

---

## 16. Frontend — Insights Page

### File: `Frontend/src/pages/Insights.jsx` (NEW)

**What it does:** Open-ended AI conversation. Checks lifestyle gate same as CheckIn. No fixed questions — Gemini drives everything. Shows a distress banner if score ≥ 5. "End Session" shows a summary card.

```jsx
import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LifestyleModal from '../components/LifestyleModal';
import { getLifestyle, startInsights, sendInsightMessage, endInsights } from '../services/api';

function Insights() {
  const [showModal, setShowModal]   = useState(false);
  const [lifestyle, setLifestyle]   = useState(null);
  const [sessionId, setSessionId]   = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [distressFlag, setDistressFlag] = useState(false);
  const [summary, setSummary]       = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const bottomRef = useRef(null);

  // On mount: check lifestyle
  useEffect(() => {
    (async () => {
      const res = await getLifestyle();
      if (!res.exists) {
        setShowModal(true);
      } else {
        setLifestyle(res.data);
      }
      setPageLoading(false);
    })();
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start session after lifestyle is confirmed
  useEffect(() => {
    if (lifestyle && !sessionId && !pageLoading) {
      beginSession();
    }
  }, [lifestyle, sessionId, pageLoading]);

  const beginSession = async () => {
    setLoading(true);
    const res = await startInsights();
    setSessionId(res.session_id);
    setMessages([{ role: 'ai', content: res.reply }]);
    setLoading(false);
  };

  const handleLifestyleComplete = (data) => {
    setLifestyle(data);
    setShowModal(false);
    // beginSession will auto-trigger from useEffect
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    const res = await sendInsightMessage(sessionId, input, updatedHistory);
    setMessages(m => [...m, { role: 'ai', content: res.reply }]);

    if (res.distress_score >= 5) setDistressFlag(true);
    setLoading(false);
  };

  const handleEndSession = async () => {
    setLoading(true);
    const res = await endInsights(sessionId, messages);
    setSummary(res.summary);
    setLoading(false);
  };

  if (pageLoading) return <><Navbar /><div style={{ marginTop: '7em', textAlign: 'center' }}>Loading...</div></>;

  return (
    <>
      <Navbar />
      {showModal && <LifestyleModal onComplete={handleLifestyleComplete} />}

      <div style={{ maxWidth: '680px', margin: '7em auto 2em', padding: '0 1rem' }}>

        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>🧠 Insights</h2>
          <p style={{ color: 'var(--text-secondary)' }}>A safe space to reflect and explore how you're feeling.</p>
        </div>

        {/* Distress banner */}
        {distressFlag && (
          <div style={{
            background: '#fef3c7', border: '1px solid #f59e0b',
            borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem',
            color: '#92400e', fontSize: '0.9rem',
          }}>
            💛 It sounds like things are a bit tough right now. Remember — talking to a counselor can really help.
          </div>
        )}

        {/* Chat area */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: '16px',
          padding: '1rem', minHeight: '400px', maxHeight: '55vh',
          overflowY: 'auto', marginBottom: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '0.75rem 1rem', borderRadius: '16px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'var(--bg-primary)',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                Typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Summary card */}
        {summary && (
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem',
          }}>
            <h3 style={{ marginBottom: '0.75rem' }}>📋 Session Summary</h3>
            <p style={{ lineHeight: 1.7 }}>{summary}</p>
          </div>
        )}

        {/* Input + End session */}
        {!summary && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Share what's on your mind..."
                style={{
                  flex: 1, padding: '0.8rem 1rem', borderRadius: '12px',
                  border: '2px solid var(--border-color)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  padding: '0.8rem 1.4rem', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700',
                }}
              >
                Send
              </button>
            </div>
            <button
              onClick={handleEndSession}
              disabled={loading || messages.length < 3}
              style={{
                width: '100%', padding: '0.7rem',
                background: 'transparent', border: '2px solid #cbd5e1',
                borderRadius: '12px', color: 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
              }}
            >
              End Session & Get Summary
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default Insights;
```

---

## 17. Frontend — Update App.jsx (Routing)

### File: `Frontend/src/App.jsx` (EDIT)

**What to change:** Import CheckIn and Insights, add their protected routes.

Find the import block at the top and add:
```jsx
import CheckIn from './pages/CheckIn';
import Insights from './pages/Insights';
```

Then inside `<Routes>`, add two new routes (after the existing ones):
```jsx
<Route path="/checkin" element={
  <ProtectedRoute><CheckIn /></ProtectedRoute>
} />
<Route path="/insights" element={
  <ProtectedRoute><Insights /></ProtectedRoute>
} />
```

Final `App.jsx` `<Routes>` block should look like:
```jsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
  <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
  <Route path="/signup/student" element={<StudentSignUp />} />
  <Route path="/signup/counselor" element={<CounselorSignUp />} />
  <Route path="/login" element={<Login />} />
</Routes>
```

---

## 18. Frontend — Update Navbar.jsx

### File: `Frontend/src/components/Navbar.jsx` (EDIT)

**What to change:** The "Check In" link currently points to `/dashboard`. Change it to point to `/checkin`.

Find this line:
```jsx
<Menu.Item as={Link} to="/dashboard" active={location.pathname === '/dashboard'} name="Check In" />
```

Replace with:
```jsx
<Menu.Item as={Link} to="/checkin" active={location.pathname === '/checkin'} name="Check In" />
```

---

## 19. Build Order (Step by Step)

Follow this exact sequence. Each step depends on the previous.

```
Step 1  → Run migration 021 (restart backend — it auto-runs)
Step 2  → Install @google/generative-ai (npm install in Backend)
Step 3  → Add GEMINI_API_KEY to Backend/.env
Step 4  → Create Backend/services/geminiService.js
Step 5  → Create Backend/controllers/checkinController.js
Step 6  → Create Backend/routes/checkinRoutes.js
Step 7  → Create Backend/controllers/insightsController.js
Step 8  → Create Backend/routes/insightsRoutes.js
Step 9  → Edit Backend/index.js (register the 2 new route files)
Step 10 → Create Frontend/src/services/api.js
Step 11 → Create Frontend/src/components/LifestyleModal.jsx
Step 12 → Create Frontend/src/pages/CheckIn.jsx
Step 13 → Create Frontend/src/pages/Insights.jsx
Step 14 → Edit Frontend/src/App.jsx (add /checkin and /insights routes)
Step 15 → Edit Frontend/src/components/Navbar.jsx (fix Check In link)
Step 16 → Test locally (npm run dev in Frontend, node index.js in Backend)
```

---

## 20. How to Test

### Backend (use Postman or curl)

1. Get a JWT token: login via the frontend, open DevTools → Application → Local Storage → copy the `access_token`

2. Test lifestyle endpoint:
```
GET http://localhost:5000/api/checkin/lifestyle
Authorization: Bearer <token>
```
Expected: `{ "exists": false }` on first run.

3. Test check-in chat:
```
POST http://localhost:5000/api/checkin/chat
Authorization: Bearer <token>
Content-Type: application/json
Body: { "messages": [], "lifestyle": {"dietary_pref": "Vegetarian", ...} }
```

### Frontend

1. Open `http://localhost:5173`
2. Login as a student
3. Click "Check In" in the navbar
4. If first time: lifestyle modal should appear
5. Fill all sections → click Continue
6. Chat should open with the first question
7. Answer all 5 questions → Gemini follow-ups → advice card at end

---

## 21. Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `GEMINI_API_KEY is not defined` | Missing env var | Add to `Backend/.env` |
| `relation lifestyle_profiles does not exist` | Migration not run | Restart backend to auto-run migrations |
| `401 Unauthorized` on API calls | JWT not sent | Check `getAuthHeader()` in `api.js` |
| `Cannot read properties of null (reading 'access_token')` | Not logged in | Make sure user is authenticated first |
| Gemini JSON parse error | Gemini returned plain text | `chatJSON` helper handles this; check prompt formatting |
