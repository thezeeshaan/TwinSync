# Product Requirements Document (PRD): TwinSync

## 1. Product Overview
**TwinSync** is a comprehensive, campus-focused mental health and counseling platform designed specifically for college students and counseling professionals. It provides a safe, anonymous, and supportive environment for students to track their mental well-being, engage with AI-driven insights, connect anonymously with peers, and access verified professional counselors. The platform also integrates critical emergency protocols and academic context to provide holistic support.

## 2. Target Audience & User Roles
The platform serves four primary distinct user roles, each with specific permissions and workflows:

*   **Student:** The primary end-user. Students use the platform for daily check-ins, AI assessments, peer community support, and anonymous counseling.
*   **Counselor:** Verified mental health professionals who provide 1-on-1 anonymous text-based counseling to students.
*   **Campus Admin (Student):** A designated student representative per college acting as an administrator. Their primary role is to verify the credentials and identity of new counselors for their specific college to ensure safety and authenticity.
*   **Faculty Advisor:** A college professor or academic advisor designated as an emergency contact. They receive automated alerts in critical situations.

## 3. User Registration & Onboarding Flow

### 3.1 Data Fields
*   **Student Registration:** Name, Age, College, Department/Field of Study, Roll Number, Phone Number, Email, Password, Emergency Contact (Name & Phone), Gender, Degree, and "Active" status toggle.
*   **Counselor Registration:** Name, Designation, Phone Number, Photo, Email, Password, Gender, Availability Schedule (Timezone/Hours/Dates), "Staff" status (if applicable), and Description/Biography.

### 3.2 Verification Flow
*   New Counselor accounts are created in a **"Pending Verification"** state.
*   Counselor profiles remain hidden from the public platform and student matching system.
*   The **Campus Admin (Student)** reviews and verifies the counselor.
*   Once marked as **"Verified"**, the counselor becomes active and available for student matching.

## 4. Data Privacy & Explicit Consent
During onboarding, users must be presented with a dedicated consent screen detailing data usage. Explicit opt-in is required for:
1.  **Campus Well-being:** Aggregate, anonymized data usage for campus-wide well-being reporting.
2.  **Daily Recommendations:** Usage of check-in data to generate personalized daily suggestions.
3.  **Counselor Sharing:** Consent to share relevant, context-aware student data with a matched counselor.
4.  **Emergency Protocols:** Explicit consent to automatically dispatch condition and location data to registered emergency contacts and faculty advisors in severe distress scenarios.
5.  **Anonymous Peer Support:** Consent to join and participate in anonymous community chat rooms.

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
*   **Matching Algorithm:** Students are matched with a random, currently available, and verified counselor.
*   **Interface:** A familiar, secure chat interface (similar to WhatsApp). **Strict Anonymity** is maintained for both the student and the counselor during the session.

### 5.4 Community (Peer Support)
*   **Workflow:** Anonymous peer-to-peer chat rooms (DMs).
*   **Mechanism:** Functions like direct messaging but entirely anonymous. Users communicate via text without revealing identities.
*   **Visibility:** DMs are organized based on user sign-ups/tags, with indicators showing peer active/inactive status.

## 6. UI/UX Layout & Architecture

### 6.1 Global Upper Navbar
*   **Left:** TwinSync Logo and Platform Name.
*   **Center (Navigation):** Links to the Four Pillars: `1. Check In` | `2. Insights` | `3. Counselor` | `4. Community`.
*   **Right:** User Profile (User Name | Phone Number).

### 6.2 Student Dashboard (Main Landing Page)
Designed with a vertical scrolling flow:
1.  **Hero/Motivation:** Prominent motivational quote and a brief (2-3 line) platform description/welcome message.
2.  **Central Content Area:** Dynamic injection point. Displays the interface for the currently selected feature from the navbar (e.g., Check-In prompt, AI chat, Counselor chat).
3.  **Community Previews:** Horizontal or grid tiles showing active anonymous community chats for quick access.
4.  **Mental Health Courses:** Feed/carousel of available educational resources and courses.
5.  **Campus Events:** Feed of upcoming mental health events on campus.
6.  **Daily Recommendation Feed:** Persistent list/feed of personalized daily wellness suggestions.
7.  **Footer:** Standard links (Privacy, Terms, Help, Contact).

## 7. Background Integrations & Emergency System

### 7.1 Emergency Protocol (Automated SOS)
*   If the system (via AI Insights or Check-ins) detects severe distress or immediate danger, it triggers the Emergency Protocol.
*   Automatically dispatches the student's current condition (and location, if permitted) to their registered Emergency Contact and designated Faculty Advisor.

### 7.2 Academic Context Integration
*   The platform ingests academic data (class routines, exam timetables, failure-specific data) where accessible via college APIs.
*   This data provides crucial context for AI recommendations (e.g., suggesting stress relief before finals) and optimizes the timing of notifications to avoid interrupting classes.

### 7.3 General Wellness Notifications
*   Automated, lightweight reminders for general well-being (e.g., "Time to drink water", "Take a 5-minute screen break").
