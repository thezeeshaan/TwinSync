# TwinSync — Project Context & Progress Log

> **Purpose:** This is a living document that tracks all decisions, progress, and context for the TwinSync project. It is updated after every major work session to keep the project state clear and accessible for future development.

---

## Project Identity

| Field | Value |
|---|---|
| **Project Name** | TwinSync |
| **Type** | Mental Health & Counseling Web Platform |
| **Target Users** | College Students & Counseling Professionals |
| **Core Philosophy** | Anonymity-first, campus-centric, AI-augmented mental health support |
| **Repository** | `thezeeshaan/TwinSync` |

---

## Folder Structure

```
TwinSync/
├── Backend/
│   ├── config/
│   │   ├── db.js                    # PostgreSQL connection pool (uses SUPABASE_DB_URL)
│   │   └── migrate.js               # Auto-migration runner with schema_migrations tracking
│   ├── controllers/
│   │   └── authController.js         # getMe, registerStudent, registerCounselor
│   ├── middleware/
│   │   └── verifySupabaseToken.js    # JWT verification using service_role key
│   ├── migration/                    # 21 SQL migration files (001–021)
│   ├── routes/
│   │   └── authRoutes.js             # /api/auth/* routes
│   ├── .env                          # Environment variables (6 vars)
│   ├── .env.example                  # Template with all 6 required vars
│   ├── index.js                      # Express server entry point
│   ├── package.json                  # Dependencies: express, pg, supabase-js, cors, dotenv
│   └── seed.js                       # Seeds IIT Kharagpur as default institute
├── Doc/
│   ├── prd.md                        # Product Requirements Document (v2)
│   ├── table.md                      # Database Schema & Table Definitions (v2, updated)
│   ├── workflow_architecture.md      # System Architecture & Workflow Diagrams (v2)
│   └── context.md                    # THIS FILE — Project context & progress log
└── Frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx             # Responsive navbar with mobile hamburger menu
    │   │   └── ThemeToggle.jsx        # Dark/light mode floating button (bottom-right)
    │   ├── config/
    │   │   └── supabaseClient.js      # Supabase client (uses VITE_SUPABASE_URL + anon key)
    │   ├── context/
    │   │   ├── AuthContext.jsx         # Auth state: user, profile, role, verificationStatus
    │   │   └── ThemeContext.jsx        # Theme toggle state (dark/light)
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   ├── StudentSignUp.jsx   # 2-step: Google OAuth → profile form (with validation)
    │   │   │   ├── CounselorSignUp.jsx # 2-step: Google OAuth → profile form (with validation)
    │   │   │   └── Login.jsx           # Google OAuth login
    │   │   ├── Dashboard.jsx           # Student/Counselor dashboard (placeholder)
    │   │   └── Landing.jsx             # Landing page with role selection cards
    │   ├── services/
    │   │   └── api.js                  # Axios/fetch config for backend API
    │   ├── App.jsx                     # Router with protected routes
    │   ├── App.css                     # Cleaned (was Vite boilerplate)
    │   └── index.css                   # Full design system: variables, glassmorphism, mobile-first
    ├── .env                            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
    ├── .env.example                    # Template with all 3 required vars
    ├── index.html                      # Entry HTML (title: TwinSync, meta description added)
    └── package.json                    # Dependencies: react, react-router-dom, supabase-js, semantic-ui, lucide-react
```

---

## Work Log

### Session 1 — 29 July 2026

**Objective:** Establish the complete project foundation — PRD, Database Schema, and Workflow Architecture.

#### What We Did

1. **Created the PRD (v1 → v2)**
   - Drafted the initial Product Requirements Document from the user's handwritten notes and detailed requirements.
   - Identified 5 areas of ambiguity and discussed them with the project owner.
   - **Key decisions made during discussion:**
     - **ERP Integration:** For the prototype, students will manually input their timetable and faculty advisor details. ERP integration (via direct backend-to-backend API with the ERP admin) is the future plan. A Cron job will handle data freshness once ERP is live.
     - **Counselor Matching:** Purely random from the verified pool. No preference/specialization filters needed for now since all counselors are pre-vetted by admins.
     - **Community Feature:** Anonymous 1-on-1 DMs (like Instagram DMs but identity-hidden), NOT chat rooms. All signed-up peers are visible with anonymous aliases and active/inactive status.
     - **Admin Provisioning:** No "Super Admin" role in the system. The project creator assigns the first Campus Admin per institute directly in the database. That admin can then promote other students.
     - **Anonymity:** No profile photos or avatars for students. Auto-generated anonymous aliases are used for all peer interactions. Counselor photos are stored solely for admin verification and never exposed to students.
   - Updated PRD to v2 reflecting all decisions.

2. **Designed the Database Schema (18 tables)**
   - **Critical design decision:** Two completely separate authentication entities:
     - `users` table — for Students (role = `student`) and Campus Admins (role = `admin`). They share the same sign-up flow; admins are promoted from students.
     - `counselors` table — entirely independent table with its own auth fields. Separate "Sign Up as Counselor" flow.
   - Faculty advisor and timetable fields placed directly in `student_profiles` (manual input for prototype, future ERP fallback).
   - Removed the separate `erp_student_data` table (prototype doesn't need it; data lives in `student_profiles`).

3. **Created Workflow Architecture Document**
   - System architecture overview (Client → API → Workers → Data → External Services).
   - Separate auth flow diagram for Students vs Counselors.
   - 9 detailed workflow diagrams (Mermaid).

---

### Session 2 — 30 July 2026

**Objective:** Full codebase audit, bug fixing, mobile-first responsiveness, and schema cleanup.

#### What We Did

1. **Table Schema Audit (Migration files vs PRD)**
   - Compared all 20 migration files (001–020) against `table.md` line by line.
   - Found 3 issues:
     - `password_hash` listed in PRD for `users` and `counselors` but correctly omitted in code (Supabase Auth handles this) → Updated `table.md` to match reality.
     - Backend `.env.example` was missing 3 required variables → Fixed.

2. **Backend & Frontend Code Audit**
   - **Bug: Backend `.env` missing critical variables** — `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `FRONTEND_URL` → User added these manually.
   - **Bug: Frontend `.env` missing `VITE_API_URL`** → User added this manually.
   - **Bug: `App.css` was 185 lines of Vite boilerplate** → Cleaned to empty placeholder.
   - **Bug: `index.html` title was "frontend"** → Changed to "TwinSync — Campus Mental Health Platform" + added meta description.
   - **Bug: `authMiddleware.js` was dead code** (unused, duplicate of `verifySupabaseToken.js`) → Deleted after discussion with user.

3. **Institute Registration Bug Fix**
   - **Bug:** Typing "iit kgp" crashed registration because the code generator produced the same code as "IIT Kharagpur" → UNIQUE constraint violation.
   - **Fix:** Created `findOrCreateInstitute()` with 3-step lookup: exact match → fuzzy word match → create new.

4. **Removed Redundant `code` Column from `institutes`**
   - The `code` column was never used meaningfully — institutes are identified by `name` (UNIQUE) and `id` (UUID).
   - Removed from: migration SQL, `authController.js`, `seed.js`, and `table.md`.
   - Created migration `021_drop_institute_code.sql` to drop the column from the live database.

5. **Form Validation (Frontend + Backend)**
   - **Student form:** Phone (10 digits), age (16–100), name/college/department/degree (min 2 chars), roll number (required), emergency phone (10 digits), all 5 consents required.
   - **Counselor form:** Phone (10 digits), name/college/designation (min 2 chars), description (min 10 chars).
   - Validation runs on **both** frontend (instant UX feedback) and backend (defense in depth).

6. **Mobile-First Responsive Design**
   - **CSS Overhaul:** Added mobile-first global rules to `index.css`:
     - `overflow-x: hidden` on body
     - Semantic UI `<Container>` forced to `width: 100%` on mobile
     - Form groups stack vertically below 768px
     - Typography scales: small defaults → larger on `min-width: 768px`
   - **Navbar:** Rebuilt with `useState`/`useEffect` for responsive detection. Below 768px → hamburger menu with vertical dropdown. Above → original horizontal layout.
   - **ThemeToggle:** Moved from top-right to bottom-right to avoid overlapping mobile navbar.
   - **Dashboard:** Heading uses `.dashboard-welcome` class with mobile-first sizing.

---

### Session 3 — 31 July 2026 (Current)

**Objective:** Implement the Community (Anonymous DMs) and Counselor (Human-to-Human Chat) pillars with real-time functionality.

#### What We Did

1. **Community Feature (Anonymous Peer DMs)**
   - **Backend:** Created `communityController.js` providing endpoints to list peers, fetch conversations, get messages, and send messages.
   - **Logic Rule:** Ensured the feature is platform-wide (ADR #16). Removed the initial institute-wise filter, so all signed-up users (students and admins) who have provided peer consent are visible.
   - **Frontend:** Built `Community.jsx` (peer list) and `CommunityChat.jsx` (chat interface).
   - **Real-Time:** Integrated Supabase Realtime to listen for `INSERT` events on the `community_messages` table.

2. **Counselor Feature (Anonymous 1-on-1 Sessions)**
   - **Backend:** Created `counselorController.js` providing endpoints to request a session, fetch sessions, toggle availability, and handle messaging.
   - **Matching Algorithm:** Implemented purely random matching (as per PRD). When a student requests a session, the system randomly selects one counselor who is both `verification_status = 'verified'` and `is_available = true`.
   - **Student Frontend:** Built `Counselor.jsx` (request interface) and `CounselorChat.jsx` (chat interface). The student sees the peer simply as "Counselor".
   - **Counselor Frontend:** Updated `Dashboard.jsx` to render a new `CounselorDashboard.jsx` when a verified counselor logs in. This dashboard allows counselors to toggle their availability status and view incoming/past sessions. The counselor sees the peer simply as "Student".
   - **Real-Time:** Integrated Supabase Realtime for the `counselor_messages` table.

   - **Real-Time:** Integrated Supabase Realtime for the `counselor_messages` table.
   - **Waiting Queue:** Implemented a waiting queue for students. If no counselor is available, a session is created with `status = 'waiting'` and no assigned `counselor_id`. Counselors see waiting sessions on their dashboard and can actively accept them. Added migration `022_nullable_counselor_session.sql` to support this.
   - **Availability Lifecycle:** Tied the counselor `is_available` toggle directly to their authentication lifecycle. Counselors automatically go active on login, and inactive on logout, while retaining manual toggle control during their session.

3. **Admin Panel Refinement**
   - **Bug Fix:** Removed the ability for Campus Admins to view all students and manually promote them. Because student identities are entirely anonymous (no names/emails stored in `users`), admins wouldn't know who they are promoting. 
   - **Decision:** Role provisioning is handled exclusively at the database level by the project creator. The admin panel is strictly scoped to reviewing and verifying pending counselors.

4. **UI/UX Refinements**
   - **Landing & Auth Overhaul:** Completely redesigned the Landing page and Auth flows. The Landing page now uses distinct color themes (Blue for Students, Amber for Counselors) to separate paths. The Login page was rebranded as a "Unified Login Portal" to reduce confusion. Added "Back" buttons across all auth views for better navigation.
   - **Counselor Navigation Bug:** Fixed a confusing UX issue where Counselors saw Student-specific navigation links (Check In, Insights, Community) and could accidentally navigate to the student-side counselor request page.
   - Implemented distinct visual themes for the chat interfaces (Teal gradient for Community, Purple gradient for Counselor) to prevent user confusion.
   - Updated `ThemeToggle.jsx` to automatically hide on all chat pages so it doesn't obstruct the message input bar on mobile devices.

---

## Key Architectural Decisions (ADR Summary)

| # | Decision | Rationale |
|---|---|---|
| 1 | Two separate auth tables (`users` + `counselors`) | Different sign-up flows, different data models, clean separation of concerns |
| 2 | Supabase Auth (Google OAuth) — no `password_hash` in app tables | Auth managed entirely by Supabase; `users.id` references `auth.users(id)` |
| 3 | No Super Admin role in the system | Project creator manages via direct DB access; reduces complexity |
| 4 | `role` ENUM on `users` is only `student` / `admin` | Campus Admins are just students with elevated privileges |
| 5 | Manual timetable + faculty advisor input (prototype) | Removes ERP dependency for the prototype |
| 6 | No profile photos for students | Anonymity-first design; counselor photos are for admin verification only |
| 7 | Auto-generated `anonymous_alias` per student | Used for Community DMs and peer interactions |
| 8 | Random counselor matching (no preferences) | All counselors are pre-vetted; simplifies the matching engine for v1 |
| 9 | Community = 1-on-1 anonymous DMs, not chat rooms | Like Instagram DMs but with hidden identities |
| 10 | Emergency protocol requires consent check | Notifications only fire if `emergency_protocols` consent is true |
| 11 | Anonymity enforced at API layer, not DB layer | DB stores real IDs (for moderation/safety); the API never exposes them |
| 12 | `institutes` table has no `code` column | Redundant — institutes identified by `name` (UNIQUE) + `id` (UUID) |
| 13 | Institute auto-creation with fuzzy matching | `findOrCreateInstitute()` searches by name/words before creating new |
| 14 | Mobile-first responsive design | Default CSS targets mobile; `min-width` media queries scale up for desktop |
| 15 | Double-layer validation (frontend + backend) | Frontend for UX, backend for security — never trust the client |
| 16 | Community & Counselor features are platform-wide | No institute filter — all consented users see each other across institutes |
| 17 | Waiting Queue over pure instant-match | Gives students a choice to wait for a counselor or fallback to AI |
| 18 | Admin role promotion disabled in UI | Prevents blind promotions since student accounts are strictly anonymous |

---

## Tech Stack (Current Status)

| Layer | Selection | Status |
|---|---|---|
| Frontend | React 18 + Vite 5 + Semantic UI React | ✅ Running |
| Backend | Node.js + Express 5 | ✅ Running |
| Database | Supabase (PostgreSQL) | ✅ Connected, 21 migrations applied |
| Auth | Supabase Auth (Google OAuth) | ✅ Working |
| Real-Time Chat | Supabase Realtime / WebSockets | ✅ Working (Community & Counselor) |
| AI/LLM | TBD (Gemini or OpenAI) | ❌ Not started |
| SMS/Email | TBD (Twilio / SendGrid) | ❌ Not started |

---

## Environment Variables

### Backend (`Backend/.env`)
| Variable | Purpose |
|---|---|
| `PORT` | Express server port (default: 5000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (for general client operations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key for JWT verification (server-side only) |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string (for migrations & queries) |
| `FRONTEND_URL` | Deployed frontend URL (for CORS) |

### Frontend (`Frontend/.env`)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key |
| `VITE_API_URL` | Backend API URL (default: `http://localhost:5000`) |

---

## What's Next

- [x] Set up the project boilerplate (Backend + Frontend)
- [x] Implement database migrations from the schema
- [x] Build the auth system (separate flows for Users and Counselors)
- [x] Fix all existing bugs and schema mismatches
- [x] Make the app mobile-first responsive
- [x] Build the Community Pillar (Anonymous Peer DMs)
- [x] Build the Counselor Pillar (Human-to-Human Chat)
- [ ] Build the Check-In Pillar (Daily mood tracking)
- [ ] Build the Insights Pillar (AI Assessment)
- [ ] Implement Emergency Protocol
- [ ] Deploy to Render (Backend) + Vercel/Netlify (Frontend)
- [ ] ERP integration (future phase)

---

## Database Migration Files

| # | File | Purpose |
|---|---|---|
| 001 | `create_institutes.sql` | Institutes table (name, erp fields) |
| 002 | `create_users.sql` | Users table (students + admins) |
| 003 | `create_student_profiles.sql` | Student profile details |
| 004 | `create_counselors.sql` | Counselors table |
| 005 | `create_counselor_availability.sql` | Counselor time slots |
| 006 | `create_user_consents.sql` | Explicit user consent flags |
| 007 | `create_check_ins.sql` | Daily mood check-ins |
| 008 | `create_daily_recommendations.sql` | AI-generated daily tips |
| 009 | `create_ai_sessions.sql` | AI Insights chat sessions |
| 010 | `create_ai_messages.sql` | AI Insights messages |
| 011 | `create_counselor_sessions.sql` | Counselor chat sessions |
| 012 | `create_counselor_messages.sql` | Counselor chat messages |
| 013 | `create_community_conversations.sql` | Anonymous DM conversations |
| 014 | `create_community_messages.sql` | Anonymous DM messages |
| 015 | `create_emergency_alerts.sql` | Emergency SOS alerts |
| 016 | `create_mental_health_courses.sql` | Mental health resources |
| 017 | `create_campus_events.sql` | Campus event listings |
| 018 | `create_notifications.sql` | Push notifications |
| 019 | `create_update_triggers.sql` | Auto-update `updated_at` timestamps |
| 020 | `create_indexes.sql` | Performance indexes |
| 021 | `drop_institute_code.sql` | Removes redundant `code` column |
| 022 | `nullable_counselor_session.sql` | Allows sessions without assigned counselor (Waiting Queue) |

---

## Document References

| Document | Path | Version |
|---|---|---|
| PRD | `Doc/prd.md` | v2 |
| DB Schema | `Doc/table.md` | v2 (updated: removed password_hash, code) |
| Architecture | `Doc/workflow_architecture.md` | v2 |
| Context | `Doc/context.md` | v2 (this file) |

