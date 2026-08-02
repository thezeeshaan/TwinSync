# Product Requirements Document (PRD): TwinSync

## 1. Product Overview
**TwinSync** is a comprehensive, campus-focused mental health and counseling platform designed specifically for college students and counseling professionals. It provides a safe, anonymous, and supportive environment for students to track their mental well-being, engage with AI-driven insights, connect anonymously with peers via direct messaging, and access verified professional counselors. The platform tightly integrates with college ERP systems to provide high-context support and automated emergency protocols.

## 2. Target Audience & User Roles
The platform has **two completely separate sign-up flows** ("Sign Up as Student" vs "Sign Up as Counselor") and serves the following roles:

*   **Student:** The primary end-user. Students use the platform for daily check-ins, AI assessments, anonymous 1-on-1 peer support, and anonymous counseling. Stored in the `users` table.
*   **Counselor:** Verified mental health professionals who provide 1-on-1 anonymous text-based counseling to students. Stored in a **separate `counselors` table** with an independent auth flow.
*   **Campus Admin (Student):** A student promoted to admin within their institute.
    *   *Provisioning:* The **first** Campus Admin for each institute is assigned directly in the database by the project creator (setting `role = 'admin'`). Subsequent admins can be promoted **in-app** by an existing Campus Admin using the "Promote Admin" feature.
    *   *Promote Admin (In-App):* An existing Campus Admin enters the email address of a registered student. The system looks up the user via Supabase Auth by email, verifies they exist in the `users` table, and promotes their role from `student` to `admin`. This preserves anonymity — the admin never sees a list of users; they must already know the person's email externally. A confirmation dialog is shown before the promotion is executed. Demotion is not supported in the current version.
    *   *Duties:* Verify counselor credentials, promote trusted students to co-admin roles, and manage platform content (mental health courses and campus events) via the Admin Panel (see Section 6.4).
*   **Faculty Advisor:** A college professor or academic advisor. In the prototype, their contact details are provided manually by the student during registration. In the future, this data will be fetched from the college ERP. They receive automated emergency alerts.

## 3. User Registration, ERP Sync & Verification Flow

### 3.1 Data Fields (Manual Input)
*   **Student Registration:** Name, Age, College, Department/Field of Study, Roll Number, Phone Number, Email, Password, Emergency Contact (Name & Phone), Gender, Degree, Faculty Advisor (Name, Email, Phone), Timetable, and "Active" status toggle.
*   **Counselor Registration:** Name, Designation, Phone Number, Photo (for admin verification only, never shown to students), Email, Password, Gender, Availability Schedule (Timezone/Hours/Dates), "Staff" status (if applicable), and Description/Biography.

> **Anonymity First:** No profile photos or avatars are stored for students. The platform auto-generates anonymous aliases for all peer interactions.

### 3.2 Academic Data: Prototype vs Future
*   **Prototype (Current):** Students manually provide their Timetable and Faculty Advisor contact details during registration. This ensures the platform works without any external ERP dependency.
*   **Future (ERP Integration):** The backend will use the student's Roll Number and College to securely hit the college's backend ERP API (coordinated directly with the ERP admin). A Cron job will periodically re-sync this data. No student ERP passwords will be required or stored. Manual fields become fallbacks.

### 3.3 Verification Flow
*   New Counselor accounts are created in a **"Pending Verification"** state and are hidden from the matching system.
*   The **Campus Admin (Student)** for that specific college reviews and verifies the counselor.
*   Once marked as **"Verified"**, the counselor becomes active and available for student matching.

## 4. Data Privacy & Explicit Consent
During onboarding, users must provide explicit opt-in consent for:
1.  **Campus Well-being:** Aggregate, anonymized data usage for campus-wide reporting.
2.  **Daily Recommendations:** Usage of check-in and ERP data to generate personalized daily suggestions.
3.  **Counselor Sharing:** Consent to share relevant, context-aware student data with a matched counselor.
4.  **Emergency Protocols:** Explicit consent to automatically dispatch condition and location data to registered emergency contacts and faculty advisors in severe distress scenarios.
5.  **Anonymous Peer Support:** Consent to participate in anonymous 1-on-1 peer direct messaging.

## 5. Core Features (The Four Pillars)

### 5.1 Check-In (Daily Routine)
*   **Workflow:** Automated daily prompt asking a specific "Daily Routine" question.
*   **Mechanism:** User responses drive personalized "Daily Recommendations."
*   **Engagement:** Gamification via a user engagement "Streak" displayed on the dashboard.

### 5.2 Insights (AI Assessment & Engagement)
*   **Workflow:** An AI agent-driven counseling and reflection session.
*   **Mechanism:** The AI initiates with a probing "AI Question". Subsequent interactions are dynamically generated based purely on the student's real-time responses, creating a deeply personalized "AI Assessment" path.

### 5.3 Counselor (Human-to-Human Chat)
*   **Workflow:** 1-on-1 text-based counseling.
*   **Matching Algorithm:** Purely random matching for new sessions. A student requesting help is randomly paired with any currently available, verified counselor from the pool.
*   **Reconnection:** Students can reopen past, completed sessions via a "Reconnect" button. This places them back in the original counselor's active session or waiting queue, displaying a "Returning Student" badge to the counselor while strictly maintaining the student's anonymity.
*   **Interface:** A secure chat interface maintaining strict anonymity for both the student and the counselor.

### 5.4 Community (Anonymous Peer Support DMs)
*   **Workflow:** Anonymous 1-on-1 Direct Messaging between students (peers).
*   **Mechanism:** The Community section acts like an anonymous DM inbox. Users see a list of all signed-up peers on the platform (represented by auto-generated anonymous aliases and active/inactive status indicators).
*   **Interaction:** A user can initiate a text-based direct message with any peer on the list. Identities are strictly hidden. There are no public "chat rooms"; all communication is peer-to-peer.

## 6. UI/UX Layout & Architecture

### 6.1 Global Upper Navbar
*   **Left:** TwinSync Logo and Platform Name.
*   **Center (Student/Admin):** Links to the Four Pillars: `1. Check In` | `2. Insights` | `3. Counselor` | `4. Community`.
*   **Center (Counselor):** Links to `1. Check In` | `2. Insights` | `3. My Sessions`.
*   **Right:** User Profile (User Name | Phone Number).

### 6.2 Shared Dashboard (Main Landing Page)
Designed with a vertical scrolling flow, shared by both Students and Counselors:
1.  **Hero/Motivational Quote:** A prominent motivational quote displayed as a gradient card. 12 mental health and wellness quotes are hardcoded in the frontend. One quote is shown per day, rotating deterministically (day-of-year % 12). Includes a brief welcome message with the user's name.
2.  **Feature Summary Cards (Pillars):** A responsive grid of 5 cards. Students see Check-In, Insights, Counselor, Community, and Platform Guide. Counselors see Check-In, Insights, My Sessions, and Platform Guide. Clicking a card navigates to the respective pillar or opens the guide modal.
3.  **Daily Recommendation Feed:** A feed of personalized daily wellness suggestions. In the **prototype**, 5–6 hardcoded generic wellness tips are shown with a small info banner. Once the AI pipeline is connected, this section will dynamically pull from the `daily_recommendations` table.
4.  **Mental Health Courses:** Feed of available educational resources (fetched from `mental_health_courses` table). Displayed as clean cards. Clicking a card opens a modal with full course details. Empty state shown if no courses exist.
5.  **Campus Events:** Feed of upcoming campus mental health events. Displayed as simplified cards (date, title). Clicking an event card opens a rich modal with the full description, time, and location. Empty state shown if no events exist.
6.  **Footer:** Standard links — Privacy Policy, Terms of Service, Help, and Contact.

### 6.3 Platform Guide
*   The onboarding guide is triggered manually by clicking the **"Platform Guide"** pillar card on the dashboard.
*   Uses **modal dialogs** to walk the user through the platform's features:
    *   What the core pillars do.
    *   How anonymity works on the platform.
    *   How to reach out for help (counselor matching, peer support).

### 6.4 Admin Panel
The Admin Panel (`/admin`) is the centralized management hub for Campus Admins. It contains:
1.  **Counselor Verification:** Review and approve/reject pending counselor applications.
2.  **All Counselors Overview:** Table view of all registered counselors with status and availability.
3.  **Promote Student to Admin:** Email-based promotion (see Section 2 — Campus Admin).
4.  **Manage Mental Health Courses:** Add new courses and **edit** or delete existing ones via embedded modal forms.
5.  **Manage Campus Events:** Add new events and **edit** or delete existing ones via embedded modal forms.

### 6.5 My Sessions (Counselor Hub)
A dedicated working page for verified Counselors (`/my-sessions`) containing:
1.  **Availability Toggle:** A switch to mark themselves as online/offline for receiving anonymous session requests.
2.  **Waiting Queue:** A list of students currently waiting for support. Targeted returning students show a distinct badge.
3.  **Active Sessions:** Ongoing chat sessions with students.
4.  **Past Sessions:** A history of completed sessions.

## 7. Background Integrations & Emergency System

### 7.1 Emergency Protocol (Automated SOS)
*   If the AI Insights session, check-ins, or manual user input detects severe distress or immediate danger, the Emergency Protocol triggers.
*   Automatically dispatches the student's current condition (and location, if permitted) to their registered Emergency Contact and designated Faculty Advisor (both from student profile data).

### 7.2 Academic Context Integration (via ERP)
*   The ingested academic data (class routines, exam timetables, performance metrics) provides crucial context for the AI service. 
*   This context allows the AI to offer tailored recommendations (e.g., stress relief before midterms) and optimizes the timing of platform notifications to avoid interrupting active classes.

### 7.3 General Wellness Notifications
*   Automated, lightweight reminders for general well-being (e.g., "Time to drink water", "Take a 5-minute screen break").

