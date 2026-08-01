# TwinSync — Zeeshan's Full Project Context

> **Purpose:** This file is a complete, always-current single source of truth for the TwinSync project.
> Read this file at the start of any new session to restore full context instantly.
> Last Updated: **1 August 2026**

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project Name** | TwinSync |
| **Owner** | Zeeshan (IIT Kharagpur student — mdaza) |
| **Type** | Mental Health & Counseling Web Platform |
| **Target Users** | College students + Campus Counseling Professionals |
| **Core Philosophy** | Anonymity-first, campus-centric, AI-augmented mental health support |
| **Corpus / Repo** | `thezeeshaan/TwinSync` |
| **Workspace Root** | `c:\Users\mdaza\OneDrive - iitkgp.ac.in\Pictures\TwinSync` |

---

## 2. Current Implementation Status

> **What is built and working as of 1 August 2026**

| Feature | Frontend | Backend | DB | Status |
|---|---|---|---|---|
| Auth (Student signup/login) | ✅ | ✅ | ✅ | **Working** |
| Auth (Counselor signup) | ✅ | ✅ | ✅ | **Working** |
| Lifestyle Profile | ✅ | ✅ | ✅ | **Working** |
| Daily Check-In (AI Chat) | ✅ | ✅ | ✅ | **Working** |
| Check-In Streak | ✅ | ✅ | ✅ | **Working** |
| Insights (4-phase AI session) | ✅ | ✅ | ✅ | **Working** |
| Insights — Past Sessions | ✅ | ✅ | ✅ | **Working** |
| Insights — Today's Wellness Tip | ✅ | ✅ | ✅ | **Working** |
| Dashboard | ✅ | ✅ | ✅ | **Working** |
| Navbar | ✅ | — | — | **Working** |
| Counselor Chat | ❌ | ❌ | ✅ (schema) | **Stub (501)** |
| Community DMs | ❌ | ❌ | ✅ (schema) | **Stub (501)** |
| Emergency Protocol | ❌ | ❌ | ✅ (schema) | **Not implemented** |

---

## 3. Folder Structure

```
TwinSync/
├── Doc/                           ← All project documentation
│   ├── prd.md                     ← Product Requirements Document (v2)
│   ├── table.md                   ← Database schema (18 tables defined)
│   ├── workflow_architecture.md   ← System architecture & diagrams
│   ├── Ai_agent_implementation.md ← AI agent design reference
│   ├── context.md                 ← Old context (outdated — use this file)
│   └── zeeshan_context.md         ← THIS FILE — full current context
│
├── Backend/
│   ├── index.js                   ← Express entry point (port 5000)
│   ├── .env                       ← Environment variables (not committed)
│   ├── .env.example               ← Template for .env
│   ├── config/
│   │   ├── db.js                  ← pg Pool helper (getClient())
│   │   └── migrate.js             ← Auto-runs SQL migrations on startup
│   ├── middleware/
│   │   └── verifySupabaseToken.js ← JWT auth middleware → sets req.authUser
│   ├── routes/
│   │   ├── authRoutes.js          ← /api/auth/*
│   │   ├── checkinRoutes.js       ← /api/checkin/*
│   │   └── insightsRoutes.js      ← /api/insights/*
│   ├── controllers/
│   │   ├── authController.js      ← getMe, registerStudent, registerCounselor
│   │   ├── checkinController.js   ← All check-in logic
│   │   └── insightsController.js  ← All insights session logic
│   ├── services/
│   │   └── aiService.js           ← Groq/OpenAI-compatible wrapper (chat, chatJSON)
│   └── migration/
│       ├── 001_create_institutes.sql
│       ├── 002_create_users.sql
│       ├── 003_create_student_profiles.sql
│       ├── 004_create_counselors.sql
│       ├── 005_create_counselor_availability.sql
│       ├── 006_create_user_consents.sql
│       ├── 007_create_check_ins.sql
│       ├── 008_create_daily_recommendations.sql
│       ├── 009_create_ai_sessions.sql
│       ├── 010_create_ai_messages.sql
│       ├── 011_create_counselor_sessions.sql
│       ├── 012_create_counselor_messages.sql
│       ├── 013_create_community_conversations.sql
│       ├── 014_create_community_messages.sql
│       ├── 015_create_emergency_alerts.sql
│       ├── 016_create_mental_health_courses.sql
│       ├── 017_create_campus_events.sql
│       ├── 018_create_notifications.sql
│       ├── 019_create_update_triggers.sql
│       ├── 020_create_indexes.sql
│       └── 021_create_lifestyle_profiles.sql
│
└── Frontend/
    ├── src/
    │   ├── App.jsx                 ← Routes + AuthThemeToggle guard
    │   ├── App.css                 ← Global styles + keyframe animations
    │   ├── config/
    │   │   └── supabaseClient.js   ← Supabase JS client (static import)
    │   ├── context/
    │   │   ├── AuthContext.jsx     ← useAuth() hook, user state
    │   │   └── ThemeContext.jsx    ← useTheme() hook, dark/light
    │   ├── components/
    │   │   ├── Navbar.jsx          ← Top nav with 4 pillars
    │   │   ├── LifestyleModal.jsx  ← Onboarding modal for lifestyle data
    │   │   └── ThemeToggle.jsx     ← Dark/light toggle button
    │   ├── pages/
    │   │   ├── Landing.jsx         ← Public landing page
    │   │   ├── Dashboard.jsx       ← Main student dashboard
    │   │   ├── CheckIn.jsx         ← Daily check-in AI chat
    │   │   ├── Insights.jsx        ← PSS AI session + past sessions
    │   │   └── auth/
    │   │       ├── Login.jsx
    │   │       ├── StudentSignUp.jsx
    │   │       └── CounselorSignUp.jsx
    │   └── services/
    │       └── api.js              ← All fetch wrappers (auth headers automatic)
    └── vite.config.js
```

---

## 4. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | Vanilla CSS (no Tailwind) |
| Backend | Node.js + Express | Port 5000 |
| Database | PostgreSQL via Supabase | Supabase handles auth JWTs |
| Auth | Supabase Auth (JWT) | Backend verifies with `SUPABASE_SERVICE_ROLE_KEY` |
| AI/LLM | Groq API (`llama-3.3-70b-versatile`) | OpenAI-compatible endpoint |
| Hosting (planned) | Vercel (Frontend) + [TBD] (Backend) | |

### Environment Variables (Backend `.env`)

```
PORT=5000
SUPABASE_URL=https://vuivjsbsipvhgpjhcwps.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=postgresql://...  ← Direct PG connection for controllers
FRONTEND_URL=https://frontend-flax-ten-ddozagsro0.vercel.app
AI_API_KEY=gsk_...                ← Groq API key
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

---

## 5. Database Schema — Key Tables

All 21 migrations have run. Full schema in `Doc/table.md`.

### Auth Split (Critical Design Decision)
- **`users`** table — Students + Campus Admins (`role`: `student` | `admin`)
- **`counselors`** table — Completely separate table with own auth fields

### Core Tables Used by Implemented Features

| Table | Key Columns | Used By |
|---|---|---|
| `institutes` | `id`, `name`, `code` | Auth registration |
| `users` | `id` (= Supabase auth UUID), `email`, `name`, `phone`, `gender`, `role`, `institute_id` | Auth |
| `student_profiles` | `user_id`, `age`, `department`, `roll_number`, `degree`, `emergency_contact_*`, `anonymous_alias`, `current_streak`, `longest_streak`, `faculty_advisor_*`, `timetable` | Auth, Dashboard |
| `counselors` | `id`, `email`, `name`, `designation`, `verification_status` (`pending`/`verified`/`rejected`) | Auth |
| `user_consents` | `user_id`, `campus_wellbeing`, `daily_recommendations`, `counselor_sharing`, `emergency_protocols`, `anonymous_peer_support` | Auth |
| `lifestyle_profiles` | `user_id`, `dietary_pref`, `meals_per_day`, `uses_smoking`, `uses_tobacco`, `uses_alcohol`, `sleep_hours`, `sleep_quality`, `activity_type[]`, `activity_freq` | CheckIn, Insights |
| `check_ins` | `user_id`, `question`, `response`, `mood_score` (nullable), `check_in_date` (UNIQUE with user_id) | CheckIn |
| `daily_recommendations` | `user_id`, `check_in_id`, `content`, `category`, `recommendation_date` | CheckIn, Insights |
| `ai_sessions` | `id`, `user_id`, `status` (`active`/`completed`/`emergency_flagged`), `summary`, `distress_level`, `started_at`, `ended_at` | Insights |
| `ai_messages` | `session_id`, `sender` (`ai`/`student`), `content`, `created_at` | Insights |

---

## 6. API Endpoints (All Implemented)

Base URL: `http://localhost:5000` (dev) / `https://[backend-url]` (prod)

### Auth Routes — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/me` | ✅ JWT | Check if user has a profile, returns `{exists, role, profile}` |
| POST | `/api/auth/register/student` | ✅ JWT | Create student profile + consents |
| POST | `/api/auth/register/counselor` | ✅ JWT | Create counselor profile (status: pending) |

### Check-In Routes — `/api/checkin`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/checkin/lifestyle` | ✅ JWT | Get lifestyle profile (`{exists, data}`) |
| POST | `/api/checkin/lifestyle` | ✅ JWT | Save/update lifestyle profile |
| GET | `/api/checkin/today` | ✅ JWT | Check if checked in today + streak |
| POST | `/api/checkin/chat` | ✅ JWT | Send message in check-in chat, get AI reply |
| POST | `/api/checkin/complete` | ✅ JWT | Complete check-in, save tip, update streak |

### Insights Routes — `/api/insights`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/insights/active` | ✅ JWT | Resume today's active session |
| POST | `/api/insights/start` | ✅ JWT | Start new session, get opening AI question |
| POST | `/api/insights/message` | ✅ JWT | Send message, get AI reply + phase state |
| POST | `/api/insights/end` | ✅ JWT | End session, get summary + suggestions |
| GET | `/api/insights/today-tip` | ✅ JWT | Get today's wellness tip from check-in |
| GET | `/api/insights/past` | ✅ JWT | List all past completed sessions (metadata only) |
| GET | `/api/insights/past/:sessionId` | ✅ JWT | Full transcript of one past session |

### Stub Routes (return 501)
- `GET/POST /api/counselor/*`
- `GET/POST /api/community/*`

---

## 7. The 4-Phase Insights Session (Core Feature)

This is the most complex feature. Fully implemented in `insightsController.js`.

### Phase Structure

```
Phase 1 — Warm-up   : Student turns 1–4    (4 gentle open questions)
Phase 2 — PSS-10    : Student turns 5–14   (10 PSS dimensions, 1 per turn)
Phase 3 — Follow-up : Student turns 15–18  (4 deeper follow-up questions)
Phase 4 — Open Chat : Student turn 19+     (free chat, End button unlocked)
```

### PSS-10 Dimensions (Phase 2, in order)
1. Perceived lack of control
2. Unpredictability of events
3. Perceived overload
4. Nervousness and stress
5. Ability to cope with demands
6. Confidence in handling problems
7. Managing irritations
8. Perceived things going well
9. Feeling on top of things
10. Accumulation of difficulties

### Distress Scoring (backend/counselor use only — NEVER shown to student)
| PSS Total | Distress Score | Meaning |
|---|---|---|
| 0–13 | 1–4 | Low stress |
| 14–33 | 5–7 | Moderate |
| 34–40 | 8–10 | High — emergency flag |

### End Flow
- User clicks "End & Summarise" button (only visible in Phase 4)
- Backend generates: session `summary`, `suggestions[]`, `pss_scores`, `pss_total`
- Session marked `completed` in DB
- Frontend shows `SummaryCard` with summary + bullet suggestions

### Session Resume Logic
- On page load, checks `GET /api/insights/active`
- If active session found → resumes from where it left off
- `showEndButton` restored based on message count (`userTurnCount > 18`)

---

## 8. Check-In Feature

### Flow
1. User opens Check-In page
2. If no lifestyle profile → `LifestyleModal` shown first
3. If already checked in today → shows today's wellness tip + streak
4. If not checked in → AI chat starts (5–7 questions about their day/routine)
5. After enough messages → user can click "Complete Check-In"
6. Backend saves check-in, generates tip, updates streak (wrapped in DB transaction)

### Key Logic
- `check_ins` has UNIQUE constraint on `(user_id, check_in_date)` — prevents duplicates
- On duplicate submit: returns existing saved tip from DB (no new AI call)
- `mood_score` is `null` (not hardcoded) — future feature
- Streak is in `student_profiles.current_streak` / `longest_streak`

---

## 9. Frontend Architecture

### Route Structure (App.jsx)
```
/ → Landing (public)
/login → Login (public)
/signup/student → StudentSignUp (public)
/signup/counselor → CounselorSignUp (public)
/dashboard → Dashboard (protected)
/checkin → CheckIn (protected)
/insights → Insights (protected)
```

### Auth Guard
- `ProtectedRoute` wraps dashboard/checkin/insights
- `AuthThemeToggle` — ThemeToggle only shown when user is logged in (not on landing/login)

### api.js — Auth Headers
All API calls go through named exports in `api.js`.  
Each function calls `getAuthHeader()` which reads the Supabase session token automatically.

```js
// Pattern used everywhere:
const headers = await getAuthHeader();
const res = await fetch(`${API_URL}/api/endpoint`, { headers });
```

### Key Components
| Component | Purpose |
|---|---|
| `Navbar.jsx` | Top navigation with links to 4 pillars + user info |
| `LifestyleModal.jsx` | Full-screen modal for collecting lifestyle data before first session |
| `ThemeToggle.jsx` | Dark/light mode toggle (auth-gated via `AuthThemeToggle`) |

### Insights UI Details
- Phone-frame chat container (max 440px wide, glassmorphism dark)
- Two tabs: **💬 Current Session** / **🕘 Past Sessions (N)**
- AIBubble (left, gradient bg), UserBubble (right, purple gradient)
- TypingDots animation shown during AI loading
- SummaryCard with session summary + numbered bullet suggestions
- `💛 Need help?` badge shown when distressFlag is true (counselor referral hint)
- End & Summarise button only shown in Phase 4 (`canEnd` state)
- Auto-scroll to bottom on every new message (via `bottomRef`)

---

## 10. Key Design Decisions

| # | Decision | Why |
|---|---|---|
| 1 | Two separate auth tables (`users` + `counselors`) | Different flows, different data models |
| 2 | Supabase Auth for JWT, own PG for data | Auth handled by Supabase; business data in direct PG |
| 3 | `req.authUser.id` from middleware — never from body | Security: prevents account impersonation |
| 4 | Session ownership check in `sendInsightMessage` | Security: prevents one user accessing another's session |
| 5 | In-memory rate limiter (60 msgs/hour) | Prevents AI cost abuse |
| 6 | Distress ≥ 8 emergency log | Counselor flag — console.warn for now, future webhook |
| 7 | DB transaction in `completeCheckin` | Atomicity: check-in + tip + streak all succeed or all roll back |
| 8 | PSS flow is phase-based, not question-count based | Allows PSS scoring to adapt to conversation length |
| 9 | Risk/distress scores never shown to students | Only for counselor/admin backend visibility |
| 10 | `anonymous_alias` auto-generated (8-char, 36^8 combinations) | Collision-proof, used for peer community DMs |
| 11 | No profile photos for students | Anonymity-first design |
| 12 | Counselors start as `pending`, Campus Admin verifies | Trust model: all counselors are pre-vetted |
| 13 | Static import for supabaseClient in api.js | Eliminated Vite dynamic/static mixed import warning |
| 14 | `AuthThemeToggle` instead of raw `ThemeToggle` in App.jsx | Hides toggle on public pages (landing, login, signup) |
| 15 | `chatStarted` guard on CheckIn input | Input hidden while AI is loading first question |

---

## 11. Rules for Future Development

1. **Strictly follow the PRD** (`Doc/prd.md`) — do not add features without Zeeshan's approval
2. **Never show risk/distress scores to students** — backend/counselor logs only
3. **Always use DB transactions** for multi-table writes
4. **Always get `userId` from `req.authUser.id`** — never from request body
5. **Session ownership must be validated** before any session-specific DB operation
6. **The Insights phase order is fixed**: Warm-up → PSS → Follow-up → Open — do not change
7. **Check-In is once-per-day** — the UNIQUE constraint enforces this at DB level too
8. **All new API endpoints must be protected** with `verifySupabaseToken` middleware
9. **Counselor and Community features are next** — return 501 stubs currently

---

## 12. Bug Audit History (1 August 2026)

All 21 bugs found in the full audit have been fixed. Key fixes:

| File | Bug Fixed |
|---|---|
| `insightsController.js` | Fixed `buildInsightsPrompt` arity, N+1 query, session ownership, rate limiting, emergency logging |
| `checkinController.js` | Fixed duplicate → return existing tip (no AI call), DB transaction, `mood_score` hardcode |
| `index.js` | Removed dead Supabase client import |
| `Insights.jsx` | Removed dead `PastSessionCard`, fixed `showEndButton` reset, session resume state |
| `CheckIn.jsx` | Added `chatStarted` guard on input footer |
| `App.jsx` | `AuthThemeToggle` — hides toggle on public pages |
| `api.js` | Removed dead `api` wrapper object, fixed dynamic import warning |

---

## 13. What Needs to Be Built Next

In priority order:

1. **Counselor Chat** (`/api/counselor/*`) — random matching, anonymous 1-on-1 chat
2. **Community DMs** (`/api/community/*`) — anonymous peer messaging
3. **Emergency Protocol** — auto-alert to emergency contact + faculty advisor
4. **Dashboard enhancement** — courses feed, events feed, community previews
5. **Campus Admin panel** — counselor verification UI
6. **ERP Integration** — future phase (cron sync of timetable/faculty data)
7. **Real-time chat** — Supabase Realtime for counselor + community chats

---

## 14. How to Run Locally

### Backend
```bash
cd Backend
node index.js
# Server starts on port 5000
# Migrations auto-run on startup
```

### Frontend
```bash
cd Frontend
npm run dev
# Dev server on http://localhost:5173
```

### Required `.env` (Backend)
```
PORT=5000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=postgresql://...
FRONTEND_URL=http://localhost:5173
AI_API_KEY=...
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
```

### Required `.env` (Frontend, `Frontend/.env`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:5000
```

---

*End of context file. Update this file at the end of every development session.*
