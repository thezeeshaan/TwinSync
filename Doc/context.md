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
├── Backend/          # (Empty — future backend code)
├── Doc/              # All project documentation
│   ├── prd.md                    # Product Requirements Document (v2)
│   ├── table.md                  # Database Schema & Table Definitions (v2, 18 tables)
│   ├── workflow_architecture.md  # System Architecture & Workflow Diagrams (v2)
│   └── context.md                # THIS FILE — Project context & progress log
└── Frontend/         # (Empty — future frontend code)
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
   - Full table list:
     1. `institutes`
     2. `users` (student / admin)
     3. `student_profiles`
     4. `counselors`
     5. `counselor_availability`
     6. `user_consents`
     7. `check_ins`
     8. `daily_recommendations`
     9. `ai_sessions`
     10. `ai_messages`
     11. `counselor_sessions`
     12. `counselor_messages`
     13. `community_conversations`
     14. `community_messages`
     15. `emergency_alerts`
     16. `mental_health_courses`
     17. `campus_events`
     18. `notifications`

3. **Created Workflow Architecture Document**
   - System architecture overview (Client → API → Workers → Data → External Services).
   - Separate auth flow diagram for Students vs Counselors.
   - 9 detailed workflow diagrams (Mermaid):
     - Student Registration & Onboarding (with manual timetable + faculty advisor)
     - Counselor Registration & Verification
     - Daily Check-In → Recommendations → Streak
     - AI Insights session (dynamic questioning + emergency detection)
     - Counselor random matching & anonymous chat
     - Community anonymous DM flow
     - Emergency SOS protocol (with consent check)
     - ERP Cron sync (marked as Future)
     - Campus Admin workflow (verification + promotion)

---

## Key Architectural Decisions (ADR Summary)

| # | Decision | Rationale |
|---|---|---|
| 1 | Two separate auth tables (`users` + `counselors`) | Different sign-up flows, different data models, clean separation of concerns |
| 2 | No Super Admin role in the system | Project creator manages via direct DB access; reduces complexity |
| 3 | `role` ENUM on `users` is only `student` / `admin` | Campus Admins are just students with elevated privileges |
| 4 | Manual timetable + faculty advisor input (prototype) | Removes ERP dependency for the prototype; fields are designed to be overwritten by ERP data in the future |
| 5 | No profile photos for students | Anonymity-first design; counselor photos are for admin verification only |
| 6 | Auto-generated `anonymous_alias` per student | Used for Community DMs and peer interactions; identity is never revealed |
| 7 | Random counselor matching (no preferences) | All counselors are pre-vetted; simplifies the matching engine for v1 |
| 8 | Community = 1-on-1 anonymous DMs, not chat rooms | Like Instagram DMs but with hidden identities; peer list with active/inactive status |
| 9 | Emergency protocol requires consent check | Even if distress is detected, notifications only fire if `emergency_protocols` consent is true |
| 10 | Anonymity enforced at API layer, not DB layer | DB stores real IDs (for moderation/safety); the API never exposes them to the other party |

---

## Tech Stack (Finalized)

| Layer | Selection | Status |
|---|---|---|
| Frontend | React.js (via Vite) | ⏳ Pending setup |
| Backend | Node.js (with Express) | ⏳ Pending setup |
| Database / Auth | Supabase (PostgreSQL under the hood) | ⏳ Pending setup |
| Real-Time Chat | Supabase Realtime / WebSockets | ⏳ Pending setup |
| AI/LLM | TBD (Gemini or OpenAI) | ❌ Not started |
| SMS/Email | TBD (Twilio / SendGrid) | ❌ Not started |
| Cache | Not needed immediately (Supabase handles much of this) | ➖ |

---

## What's Next

- [ ] Finalize tech stack decisions (Frontend framework, Backend framework)
- [ ] Set up the project boilerplate (Backend + Frontend)
- [ ] Implement database migrations from the schema
- [ ] Build the auth system (separate flows for Users and Counselors)
- [ ] Build the Four Pillars (Check-In → Insights → Counselor → Community)
- [ ] Implement Emergency Protocol
- [ ] ERP integration (future phase)

---

## Document References

| Document | Path | Version | Description |
|---|---|---|---|
| PRD | [prd.md](file:///c:/Users/mdaza/OneDrive%20-%20iitkgp.ac.in/Pictures/TwinSync/Doc/prd.md) | v2 | Product Requirements Document |
| DB Schema | [table.md](file:///c:/Users/mdaza/OneDrive%20-%20iitkgp.ac.in/Pictures/TwinSync/Doc/table.md) | v2 | 18-table database schema |
| Architecture | [workflow_architecture.md](file:///c:/Users/mdaza/OneDrive%20-%20iitkgp.ac.in/Pictures/TwinSync/Doc/workflow_architecture.md) | v2 | System & workflow diagrams |
| Context | [context.md](file:///c:/Users/mdaza/OneDrive%20-%20iitkgp.ac.in/Pictures/TwinSync/Doc/context.md) | v1 | This file — project tracker |
