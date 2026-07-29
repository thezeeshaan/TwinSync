# TwinSync — Workflow Architecture (v2)

This document outlines the complete system workflow, reflecting the two-entity auth model (Users + Counselors) and the prototype-first approach.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Client["Client Layer (3 Interfaces)"]
        SA["Student Web App"]
        CD["Counselor Web App"]
        AP["Campus Admin Panel\n(within Student App)"]
    end

    subgraph API["API & Business Logic Layer"]
        AUTH["Auth Service\n(Separate login for\nUsers & Counselors)"]
        CHECKIN["Check-In Service"]
        AI["AI Agent Service\n(Insights)"]
        MATCH["Counselor\nMatching Engine"]
        CHAT["Real-Time Chat Server\n(WebSocket)"]
        COMMUNITY["Community\nDM Service"]
    end

    subgraph BG["Background Workers"]
        SOS["Emergency SOS Worker"]
        NOTIFY["Notification Worker\n(Wellness Reminders)"]
        STREAK["Streak Calculator"]
        ERP["ERP Sync Cron Job\n(Future)"]
    end

    subgraph DATA["Data Layer"]
        DB[("PostgreSQL\n(18 Tables)")]
        CACHE[("Redis\n(Sessions / Online Status)")]
    end

    subgraph EXT["External Services"]
        LLM["LLM API\n(Gemini / OpenAI)"]
        SMS["SMS/Email Gateway\n(Twilio / SendGrid)"]
        COLLEGE["College ERP API\n(Future Integration)"]
    end

    SA --> AUTH
    CD --> AUTH
    AP --> AUTH
    AUTH --> DB

    SA --> CHECKIN --> DB
    SA --> AI --> LLM
    AI --> DB
    SA --> MATCH --> CHAT
    CHAT --> DB
    CHAT --> CACHE
    SA --> COMMUNITY --> CHAT

    SOS --> SMS
    SOS --> DB
    NOTIFY --> SMS
    STREAK --> DB
    ERP -.->|Future| COLLEGE
    ERP -.->|Future| DB

    AI -.->|distress detected| SOS
    CHECKIN -.->|distress detected| SOS
```

---

## 2. Authentication Architecture

Since `users` and `counselors` are separate tables, authentication is handled with two distinct flows:

```mermaid
flowchart TD
    A["Landing Page"] --> B{"Sign Up As..."}
    B -->|Student| C["Student Registration Form"]
    B -->|Counselor| D["Counselor Registration Form"]

    C --> E["users table\n(role = student)"]
    E --> F["student_profiles table"]
    F --> G["user_consents table"]
    G --> H["Student Dashboard"]

    D --> I["counselors table\n(status = pending)"]
    I --> J["Waiting for\nAdmin Verification"]

    K["Returning User"] --> L{"Login As..."}
    L -->|Student / Admin| M["Auth against\nusers table"]
    L -->|Counselor| N["Auth against\ncounselors table"]
    M --> H
    N --> O["Counselor Dashboard"]
```

---

## 3. User Journey Workflows

### 3.1 Student Registration & Onboarding

```mermaid
flowchart TD
    A["Student clicks\n'Sign Up as Student'"] --> B["Registration Form"]
    B --> C["Inputs: Name, Age, College, Dept,\nRoll No, Phone, Email, Password,\nEmergency Contact, Gender, Degree"]
    C --> C2["Prototype Inputs:\nFaculty Advisor (Name, Email, Phone)\nTimetable (manual entry)"]
    C2 --> D["Record created in\nusers table (role = student)"]
    D --> E["Record created in\nstudent_profiles table\n(includes faculty advisor + timetable)"]
    E --> F["Anonymous alias\nauto-generated"]
    F --> G["Consent Screen"]
    G --> H["Student selects\nconsent preferences"]
    H --> I["Saved to\nuser_consents table"]
    I --> J["Student Dashboard\nloaded"]
```

---

### 3.2 Counselor Registration & Verification

```mermaid
flowchart TD
    A["Counselor clicks\n'Sign Up as Counselor'"] --> B["Registration Form"]
    B --> C["Inputs: Name, Designation, Phone,\nPhoto, Email, Password, Gender,\nAvailability Schedule, Description"]
    C --> D["Record created in\ncounselors table\n(status = pending)"]
    D --> E["Availability slots saved to\ncounselor_availability"]
    E --> F["Profile HIDDEN from\nstudent matching pool"]
    F --> G["Campus Admin sees\npending verification request"]
    G --> H{"Admin reviews\ncredentials & photo"}
    H -->|Approve| I["status → verified\nCounselor now matchable"]
    H -->|Reject| J["status → rejected\nCounselor notified"]
```

---

### 3.3 Daily Check-In Flow

```mermaid
flowchart TD
    A["System triggers daily\ncheck-in reminder\n(notification)"] --> B["Student opens\nCheck-In from navbar"]
    B --> C["System presents\nDaily Routine Question"]
    C --> D["Student submits\nresponse"]
    D --> E["Response saved\nto check_ins table"]
    E --> F["Streak Calculator:\nupdates current_streak\n& longest_streak\nin student_profiles"]
    F --> G{"Response indicates\nsevere distress?"}
    G -->|No| H["AI generates\nDaily Recommendations"]
    H --> I["Saved to\ndaily_recommendations\n& shown on dashboard"]
    G -->|Yes| K["Emergency Protocol\nTriggered → see 3.7"]
```

---

### 3.4 AI Insights Session Flow

```mermaid
flowchart TD
    A["Student clicks\n'Insights' in navbar"] --> B["New ai_session created\n(status = active)"]
    B --> C["AI sends opening\nprobing question"]
    C --> D["Student responds"]
    D --> E["AI analyzes response\n+ timetable context\n+ past check-in history"]
    E --> F["AI generates next\ndynamic question"]
    F --> G{"Student continues?"}
    G -->|Yes| D
    G -->|No| H["AI generates\nsession summary"]
    H --> I{"Distress level\nexceeds threshold?"}
    I -->|No| J["Session saved as\ncompleted"]
    I -->|Yes| K["Session marked\nemergency_flagged"]
    K --> L["Emergency Protocol\nTriggered → see 3.7"]
```

---

### 3.5 Counselor Matching & Chat Flow

```mermaid
flowchart TD
    A["Student clicks\n'Counselor' in navbar"] --> B["Student requests\ncounseling session"]
    B --> C["Matching Engine queries\ncounselors table:\nverified + available\n+ within schedule"]
    C --> D{"Available counselor\nfound?"}
    D -->|No| E["'No counselors available.\nPlease try later.'"]
    D -->|Yes| F["Random counselor\nassigned from pool"]
    F --> G["counselor_session created\n(status = active)"]
    G --> H["WebSocket connection\nfor both parties"]
    H --> I["Anonymous chat begins\n(no real names shown)"]
    I --> J{"Session ended?"}
    J -->|Yes| K["status → completed\nWebSocket closed"]
```

---

### 3.6 Community Anonymous DM Flow

```mermaid
flowchart TD
    A["Student clicks\n'Community' in navbar"] --> B["System loads all\nsigned-up peers\nfrom users table"]
    B --> C["Each peer displayed as:\nanonymous_alias +\nactive/inactive badge\n(from last_seen_at)"]
    C --> D["Student selects\na peer to DM"]
    D --> E{"Existing\nconversation?"}
    E -->|Yes| F["Load existing\nDM thread"]
    E -->|No| G["Create new\ncommunity_conversation"]
    G --> F
    F --> H["Anonymous text chat\nvia WebSocket"]
    H --> I["Messages saved to\ncommunity_messages"]
```

---

### 3.7 Emergency Protocol Flow

```mermaid
flowchart TD
    A["Trigger Source:\n• AI session flags distress\n• Check-in flags distress\n• Manual trigger"] --> B["emergency_alert\nrecord created"]
    B --> C{"Student consented to\nemergency_protocols?"}
    C -->|No| D["Alert logged\nbut NO notification sent"]
    C -->|Yes| E["Fetch emergency_contact\nfrom student_profiles"]
    E --> F["Fetch faculty_advisor\nfrom student_profiles"]
    F --> G["SMS/Email dispatched\nto Emergency Contact"]
    G --> H["SMS/Email dispatched\nto Faculty Advisor"]
    H --> I["Alert includes:\n• Student condition\n• Location (if available)"]
    I --> J["Alert tracked\nuntil resolved"]
```

---

### 3.8 Campus Admin Workflow

```mermaid
flowchart TD
    A["Project creator sets\nrole = 'admin' directly in DB\nfor first admin per institute"] --> B["Campus Admin logs in\n(via Student login flow)"]
    B --> C["Admin Panel shows:\n• Pending counselor verifications\n• User management"]
    C --> D["Admin reviews\ncounselor credentials & photo"]
    D --> E{"Approve or Reject?"}
    E -->|Approve| F["counselors.verification_status\n→ verified"]
    E -->|Reject| G["counselors.verification_status\n→ rejected"]
    B --> H["Admin can promote\nother students to admin\n(users.role → 'admin')"]
```

---

## 4. Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐     │
│  │  Student App │    │  Counselor App  │    │  Admin Panel │     │
│  └──────┬──────┘    └───────┬─────────┘    └──────┬───────┘     │
└─────────┼───────────────────┼──────────────────────┼─────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API LAYER (Backend)                           │
│                                                                  │
│  Auth ─── Check-In ─── AI Agent ─── Matching ─── Chat (WS)     │
│                                                                  │
└────────┬─────────────────┬──────────────────┬────────────────────┘
         │                 │                  │
         ▼                 ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│  PostgreSQL  │   │   LLM API    │   │  SMS/Email       │
│  (18 Tables) │   │  (Gemini /   │   │  (Twilio /       │
│              │   │   OpenAI)    │   │   SendGrid)      │
└──────────────┘   └──────────────┘   └──────────────────┘
                                             ▲
                                             │
                                      ┌──────┴───────┐
                                      │  Background  │
                                      │  Workers     │
                                      │  (SOS,       │
                                      │   Streaks,   │
                                      │   Reminders) │
                                      └──────────────┘
```
