# Product Requirements Document (PRD): TwinSync

## 1. Product Overview
**TwinSync** is a comprehensive, campus-focused mental health and counseling platform designed specifically for college students and counseling professionals. It provides a safe, anonymous, and supportive environment for students to track their mental well-being, engage with AI-driven insights, connect anonymously with peers via direct messaging, and access verified professional counselors. The platform tightly integrates with college ERP systems to provide high-context support and automated emergency protocols.

## 2. Target Audience & User Roles
The platform has **two completely separate sign-up flows** ("Sign Up as Student" vs "Sign Up as Counselor") and serves the following roles:

*   **Student:** The primary end-user. Students use the platform for daily check-ins, AI assessments, anonymous 1-on-1 peer support, and anonymous counseling. Stored in the `users` table.
*   **Counselor:** Verified mental health professionals who provide 1-on-1 anonymous text-based counseling to students. Stored in a **separate `counselors` table** with an independent auth flow.
*   **Campus Admin (Student):** A student promoted to admin within their institute.
    *   *Provisioning:* All Campus Admins are assigned directly in the database by the project creator (setting `role = 'admin'`). In-app role promotion is intentionally excluded because student identities are anonymous — an admin cannot identify who to promote.
    *   *Duties:* Primary role is to verify the credentials and identity of new counselors for their specific college.
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
*   **Matching Algorithm:** Purely random matching. A student requesting help is randomly paired with any currently available, verified counselor from the pool. (No manual preference selection by the student is required, as all counselors are pre-vetted by admins).
*   **Interface:** A secure chat interface maintaining strict anonymity for both the student and the counselor.

### 5.4 Community (Anonymous Peer Support DMs)
*   **Workflow:** Anonymous 1-on-1 Direct Messaging between students (peers).
*   **Mechanism:** The Community section acts like an anonymous DM inbox. Users see a list of all signed-up peers on the platform (represented by auto-generated anonymous aliases and active/inactive status indicators).
*   **Interaction:** A user can initiate a text-based direct message with any peer on the list. Identities are strictly hidden. There are no public "chat rooms"; all communication is peer-to-peer.

## 6. UI/UX Layout & Architecture

### 6.1 Global Upper Navbar
*   **Left:** TwinSync Logo and Platform Name.
*   **Center:** Links to the Four Pillars: `1. Check In` | `2. Insights` | `3. Counselor` | `4. Community`.
*   **Right:** User Profile (User Name | Phone Number).

### 6.2 Student Dashboard (Main Landing Page)
Designed with a vertical scrolling flow:
1.  **Hero/Motivation:** Prominent motivational quote and a brief platform description/welcome.
2.  **Central Content Area:** Dynamic injection point for the currently selected feature from the navbar.
3.  **Community Previews:** Side-by-side tiles showing active anonymous peer DMs for quick access.
4.  **Mental Health Courses:** Feed of available educational resources.
5.  **Campus Events:** Feed of upcoming campus mental health events.
6.  **Daily Recommendation Feed:** Persistent feed of personalized daily wellness suggestions.
7.  **Footer:** Standard links (Privacy, Terms, Help, Contact).

## 7. Background Integrations & Emergency System

### 7.1 Emergency Protocol (Automated SOS)
*   If the AI Insights session, check-ins, or manual user input detects severe distress or immediate danger, the Emergency Protocol triggers.
*   Automatically dispatches the student's current condition (and location, if permitted) to their registered Emergency Contact and designated Faculty Advisor (both from student profile data).

### 7.2 Academic Context Integration (via ERP)
*   The ingested academic data (class routines, exam timetables, performance metrics) provides crucial context for the AI service. 
*   This context allows the AI to offer tailored recommendations (e.g., stress relief before midterms) and optimizes the timing of platform notifications to avoid interrupting active classes.

### 7.3 General Wellness Notifications
*   Automated, lightweight reminders for general well-being (e.g., "Time to drink water", "Take a 5-minute screen break").
