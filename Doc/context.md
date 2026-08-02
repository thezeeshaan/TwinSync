# TwinSync Project Context

This document tracks the ongoing development of the TwinSync platform.

## What is TwinSync?
TwinSync is a campus-focused mental health and counseling platform designed for college students and counseling professionals. It provides a safe, anonymous environment for students to track their well-being, engage with AI-driven insights, connect with peers, and access verified professional counselors.

## Recent Progress
We have recently completed a significant overhaul of the core student and counselor experiences:

### 1. Dashboard Redesign
- The main student dashboard was upgraded to a modern, responsive layout.
- Added a daily motivational quote hero section (cycles through 12 hardcoded quotes deterministically).
- Implemented a 4-pillar navigation system (Check-In, Insights, Counselor, Community).
- Integrated feeds for Mental Health Courses and Campus Events.
- Event cards now open detailed modals when clicked, keeping the dashboard interface clean.
- Created a dark-theme UI with teal accents for a premium feel.

### 2. Admin Panel Updates
- Built a secure Admin Panel for Campus Admins.
- Admins can promote other students to admin via email.
- Admins can manage (Add, Edit, Delete) Mental Health Courses and Campus Events.
- Converted all Add/Edit forms into clean Modals instead of inline expanding panels, dramatically improving the layout.
- Added `.dark-modal` CSS to ensure semantic-ui modals match the platform's dark theme.

### 3. Counselor Experience Overhaul
- **Shared Dashboard:** Counselors no longer drop straight into a sterile working queue. They now see the same rich dashboard as students (Quote, Courses, Events, Platform Guide), helping them feel integrated into the campus ecosystem.
- **Self-Care Access:** Counselors have access to the Check-In and Insights pillars for their own well-being tracking.
- **Counselor Hub:** The actual counselor working tools (Availability toggle, Waiting Queue, Active/Past Sessions) have been moved to a dedicated `/my-sessions` page.

### 4. Session Reconnection (Returning Students)
- We solved the problem of anonymous students wanting to speak to the *same* counselor again without breaking anonymity.
- Added a **"Reconnect"** button to the student's past sessions list.
- Implemented a `reconnectSession` backend endpoint that creates a new session with a `parent_session_id` linking back to the original.
- If the counselor is online, it creates an active session. If they are offline, it places the student in a *targeted* waiting queue for that specific counselor.
- The counselor sees a blue **"🔄 Returning"** badge in their queue/active list, letting them know they've spoken to this user before.

### 5. Onboarding Guide
- Created a robust onboarding guide to explain anonymity and the 4 pillars.
- Removed the annoying auto-popup logic. The guide is now accessed manually via a prominent pink "Platform Guide" pillar card on the dashboard.

### 6. Theme Consistency & UI Polish
- **Global Theme Audit:** Conducted a comprehensive audit of light and dark mode CSS to ensure premium aesthetics in both themes.
- **Modal Fixes:** Corrected the `.dark-modal` implementation so that modals use adaptive backgrounds (using `var(--panel-bg)`) rather than hardcoded dark fallbacks, fixing visibility issues in light mode.
- **Mobile Responsiveness Check:** Verified mobile layouts for the dashboard grids (which collapse gracefully), Semantic UI overrides (forcing 100% width on segments and cards), and Chat screens (which fluidly adopt 100dvh natively).
- **Premium User Profile Dropdown:** Replaced the basic text-and-button user info on the navbar with a premium, glassmorphic dropdown. This dropdown features an initials avatar, role badge, theme toggle switch, and a logout action.

## Next Steps
We are now ready to tackle the remaining features as per the PRD, which likely involve building out the AI Insights pipeline, the Check-In streak mechanics, or the anonymous Community DM system.
