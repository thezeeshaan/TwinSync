# TwinSync — Database Schema & Table Definitions (v2)

> **Convention:** All tables use `UUID` primary keys, `created_at` / `updated_at` timestamps, and soft-delete via `deleted_at` where applicable.
> 
> **Key Design Decision:** The platform has two completely separate authentication entities — `users` (students & campus admins) and `counselors`. They sign up through different flows ("Sign Up as Student" vs "Sign Up as Counselor") and have entirely different data models.

---

## 1. `institutes`
Represents each college/university onboarded to TwinSync.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `name` | VARCHAR(255) | NOT NULL, UNIQUE | e.g. "IIT Kharagpur" |
| `erp_api_base_url` | TEXT | NULLABLE | Future: Base URL for ERP integration |
| `erp_api_key` | TEXT | NULLABLE | Future: Encrypted API key for ERP access |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

> **Note:** Institutes are auto-created during student/counselor registration if no matching name is found. They can also be seeded manually.

---

## 2. `users`
Central table for **Students** and **Campus Admins**. Both share the same sign-up flow; admins are promoted from existing students.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, FK → auth.users(id) | Supabase Auth manages authentication |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Login identifier |
| `phone` | VARCHAR(20) | NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Full name |
| `gender` | ENUM('male','female','non_binary','prefer_not_to_say') | NOT NULL | |
| `role` | ENUM('student','admin') | NOT NULL, DEFAULT 'student' | Admin = Campus Admin |
| `institute_id` | UUID | FK → institutes.id, NOT NULL | Every user belongs to a college |
| `is_active` | BOOLEAN | DEFAULT true | Account active toggle |
| `last_seen_at` | TIMESTAMP | NULLABLE | For online/offline status in Community DMs |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete |

> **Auth Note:** No `password_hash` column — authentication is handled entirely by Supabase Auth (Google OAuth). The `id` column references `auth.users(id)` directly.

> **Admin Provisioning:** The first Campus Admin per institute is assigned by the project creator directly in the DB (setting `role = 'admin'`). That admin can then promote other students via the admin panel.

---

## 3. `student_profiles`
Extended profile data for every user (both students and admins are students at heart).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, UNIQUE | One-to-one with users |
| `age` | INT | NOT NULL | |
| `department` | VARCHAR(255) | NOT NULL | e.g. "Computer Science" |
| `roll_number` | VARCHAR(100) | NOT NULL | Used for future ERP lookup |
| `degree` | VARCHAR(100) | NOT NULL | e.g. "B.Tech", "M.Sc" |
| `emergency_contact_name` | VARCHAR(255) | NOT NULL | Manual input |
| `emergency_contact_phone` | VARCHAR(20) | NOT NULL | Manual input |
| `faculty_advisor_name` | VARCHAR(255) | NULLABLE | Prototype: manual input. Future: from ERP |
| `faculty_advisor_email` | VARCHAR(255) | NULLABLE | Prototype: manual input. Future: from ERP |
| `faculty_advisor_phone` | VARCHAR(20) | NULLABLE | Prototype: manual input. Future: from ERP |
| `timetable` | JSONB | NULLABLE | Prototype: manual input. Future: from ERP |
| `current_streak` | INT | DEFAULT 0 | Consecutive check-in days |
| `longest_streak` | INT | DEFAULT 0 | All-time best streak |
| `anonymous_alias` | VARCHAR(100) | NOT NULL, UNIQUE | Auto-generated for Community DMs |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

> **Prototype vs Future:** Fields like `faculty_advisor_*` and `timetable` are filled manually by the student during registration for the prototype. Once ERP endpoints are integrated, these will be auto-fetched and the manual fields become fallbacks.

---

## 4. `counselors`
**Completely separate authentication table** for counseling professionals. They sign up through the "Sign Up as Counselor" flow.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, FK → auth.users(id) | Supabase Auth manages authentication |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Login identifier |
| `phone` | VARCHAR(20) | NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Full name |
| `gender` | ENUM('male','female','non_binary','prefer_not_to_say') | NOT NULL | |
| `designation` | VARCHAR(255) | NOT NULL | e.g. "Clinical Psychologist" |
| `photo_url` | TEXT | NULLABLE | For admin verification purposes only |
| `description` | TEXT | NULLABLE | Bio / about section |
| `is_staff` | BOOLEAN | DEFAULT false | College staff or external |
| `institute_id` | UUID | FK → institutes.id, NOT NULL | College they are registering under |
| `verification_status` | ENUM('pending','verified','rejected') | DEFAULT 'pending' | |
| `verified_by` | UUID | FK → users.id, NULLABLE | Campus Admin who verified |
| `verified_at` | TIMESTAMP | NULLABLE | |
| `is_available` | BOOLEAN | DEFAULT false | Quick online/offline toggle |
| `last_seen_at` | TIMESTAMP | NULLABLE | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `deleted_at` | TIMESTAMP | NULLABLE | Soft delete |

> **Auth Note:** No `password_hash` column — authentication is handled entirely by Supabase Auth (Google OAuth). The `id` column references `auth.users(id)` directly.

> **Anonymity Note:** `photo_url` is stored solely for admin verification. It is **never** exposed to students during counseling sessions or anywhere on the student-facing interface.

---

## 5. `counselor_availability`
Counselor's recurring or specific availability slots.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `counselor_id` | UUID | FK → counselors.id | |
| `day_of_week` | ENUM('mon','tue','wed','thu','fri','sat','sun') | NULLABLE | For recurring slots |
| `specific_date` | DATE | NULLABLE | For one-off availability |
| `start_time` | TIME | NOT NULL | |
| `end_time` | TIME | NOT NULL | |
| `timezone` | VARCHAR(50) | NOT NULL | e.g. "Asia/Kolkata" |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

> Either `day_of_week` (recurring) or `specific_date` (one-off) should be set, not both.

---

## 6. `user_consents`
Tracks each student's explicit consent choices from the onboarding screen.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, UNIQUE | One consent record per student |
| `campus_wellbeing` | BOOLEAN | DEFAULT false | Aggregate data reporting |
| `daily_recommendations` | BOOLEAN | DEFAULT false | Personalized suggestions |
| `counselor_sharing` | BOOLEAN | DEFAULT false | Share data with matched counselor |
| `emergency_protocols` | BOOLEAN | DEFAULT false | Auto-alert emergency contacts |
| `anonymous_peer_support` | BOOLEAN | DEFAULT false | Participate in Community DMs |
| `consented_at` | TIMESTAMP | NOT NULL | When consent was first given |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | If consent is modified later |

---

## 7. `check_ins`
Daily check-in responses from students.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id | |
| `question` | TEXT | NOT NULL | The daily question asked |
| `response` | TEXT | NOT NULL | Student's answer |
| `mood_score` | INT | NULLABLE | Derived score (1-10) if applicable |
| `check_in_date` | DATE | NOT NULL | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

> **Constraint:** UNIQUE(`user_id`, `check_in_date`) — one check-in per student per day.

---

## 8. `daily_recommendations`
Personalized recommendations generated from check-in responses and academic context.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id | |
| `check_in_id` | UUID | FK → check_ins.id, NULLABLE | Linked check-in that triggered this |
| `content` | TEXT | NOT NULL | The recommendation text |
| `category` | VARCHAR(100) | NULLABLE | e.g. "wellness", "academic", "social" |
| `is_read` | BOOLEAN | DEFAULT false | |
| `recommendation_date` | DATE | NOT NULL | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## 9. `ai_sessions`
Each AI Insights conversation session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id | |
| `status` | ENUM('active','completed','emergency_flagged') | DEFAULT 'active' | |
| `summary` | TEXT | NULLABLE | AI-generated session summary |
| `distress_level` | INT | NULLABLE | AI-assessed level (1-10) |
| `started_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `ended_at` | TIMESTAMP | NULLABLE | |

---

## 10. `ai_messages`
Individual messages within an AI session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `session_id` | UUID | FK → ai_sessions.id | |
| `sender` | ENUM('ai','student') | NOT NULL | |
| `content` | TEXT | NOT NULL | Message text |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## 11. `counselor_sessions`
Anonymous 1-on-1 counselor chat sessions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id | Student requesting help |
| `counselor_id` | UUID | FK → counselors.id | Matched counselor |
| `status` | ENUM('waiting','active','completed','emergency_flagged') | DEFAULT 'waiting' | |
| `started_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `ended_at` | TIMESTAMP | NULLABLE | |

> **Anonymity:** The chat interface never reveals real identities. Enforced at the API layer.

---

## 12. `counselor_messages`
Messages within a counselor chat session.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `session_id` | UUID | FK → counselor_sessions.id | |
| `sender_role` | ENUM('student','counselor') | NOT NULL | No real identity exposed |
| `content` | TEXT | NOT NULL | |
| `is_read` | BOOLEAN | DEFAULT false | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## 13. `community_conversations`
Anonymous 1-on-1 peer DM threads (like Instagram DMs but fully anonymous).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `participant_one_id` | UUID | FK → users.id | |
| `participant_two_id` | UUID | FK → users.id | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | Updated on last message |

> **Constraint:** UNIQUE(`participant_one_id`, `participant_two_id`) — one DM thread per pair. Identities displayed as `anonymous_alias` from `student_profiles`.

---

## 14. `community_messages`
Messages within a peer DM conversation.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `conversation_id` | UUID | FK → community_conversations.id | |
| `sender_id` | UUID | FK → users.id | Stored for moderation, never shown to peer |
| `content` | TEXT | NOT NULL | |
| `is_read` | BOOLEAN | DEFAULT false | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## 15. `emergency_alerts`
Log of every emergency protocol trigger.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id | Student in distress |
| `trigger_source` | ENUM('ai_session','check_in','manual') | NOT NULL | What triggered the alert |
| `trigger_reference_id` | UUID | NULLABLE | ID of the ai_session or check_in |
| `distress_description` | TEXT | NULLABLE | Context sent to contacts |
| `location` | TEXT | NULLABLE | Student location if available |
| `emergency_contact_notified` | BOOLEAN | DEFAULT false | |
| `faculty_advisor_notified` | BOOLEAN | DEFAULT false | |
| `status` | ENUM('triggered','acknowledged','resolved') | DEFAULT 'triggered' | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |
| `resolved_at` | TIMESTAMP | NULLABLE | |

---

## 16. `mental_health_courses`
Available mental health educational resources.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULLABLE | |
| `content_url` | TEXT | NOT NULL | Link to course/resource |
| `thumbnail_url` | TEXT | NULLABLE | |
| `institute_id` | UUID | FK → institutes.id, NULLABLE | NULL = global course |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## 17. `campus_events`
Campus mental health events.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NULLABLE | |
| `event_date` | TIMESTAMP | NOT NULL | |
| `location` | VARCHAR(255) | NULLABLE | |
| `institute_id` | UUID | FK → institutes.id | |
| `created_by` | UUID | FK → users.id | Admin who created it |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## 18. `notifications`
All system-generated notifications (wellness reminders, alerts, etc.).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id | Recipient |
| `type` | ENUM('wellness','emergency','check_in_reminder','recommendation','system') | NOT NULL | |
| `title` | VARCHAR(255) | NOT NULL | |
| `body` | TEXT | NOT NULL | |
| `is_read` | BOOLEAN | DEFAULT false | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW | |

---

## Entity Relationship Summary

```
institutes ─┬── users ─┬── student_profiles (includes timetable + faculty advisor)
             │          ├── user_consents
             │          ├── check_ins ── daily_recommendations
             │          ├── ai_sessions ── ai_messages
             │          ├── counselor_sessions ── counselor_messages
             │          ├── community_conversations ── community_messages
             │          ├── emergency_alerts
             │          └── notifications
             │
             ├── counselors ─┬── counselor_availability
             │               └── counselor_sessions
             │
             ├── mental_health_courses
             └── campus_events
```

> **Two Auth Entities:** `users` and `counselors` are completely independent tables with separate login flows. They only intersect at `counselor_sessions` (where a student is matched with a counselor) and `counselors.verified_by` (which references a Campus Admin from `users`).
