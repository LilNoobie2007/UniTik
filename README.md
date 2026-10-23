# 🎟️ UniTik - Campus Event & Ticketing Management System

![Version](https://img.shields.io/badge/Version-1.1_(Production_Ready)-ff003c?style=for-the-badge)
![PHP](https://img.shields.io/badge/PHP_8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_3NF-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**Discover. Book. Validate.**  
UniTik is a full-stack campus event management and secure ticketing platform designed to handle student event discovery, organizer management, transactional ticket bookings, and real-time gate validation. 

Built with a strict separation of concerns, the Next.js client never communicates directly with the database. All identity is managed via HttpOnly sessions, and all data transactions are routed through a hardened PHP/PDO Backend-For-Frontend (BFF).

---

## 🚀 Development Milestones (Completed)

The architecture was executed across 19 strict milestones to ensure database normalization, strict Role-Based Access Control (RBAC), and transactional safety.

### Phase 1: Core Architecture & Auth
* **M1 - Database:** Supabase PostgreSQL setup strictly adhering to 3NF. Source of truth for `users`, `events`, `venues`, `tickets`, `logs`, and `payments`.
* **M2 - Authentication:** HttpOnly session-based auth. Server-enforced roles (`student`, `organizer`, `admin`). Strict password hashing.
* **M8 - Session Management:** `me.php` user hydration and secure `logout.php` session destruction.
* **M16 - Password Rotation:** Secure credential updates with active session invalidation.

### Phase 2: Booking Engine & Ticketing
* **M3 - Booking & Validation:** Atomic transaction locking to prevent overselling. 409 responses for duplicate bookings.
* **M9 - Ticket QR Code:** Client-side Byte-mode QR generation with Level M error correction directly from `ticket_hash`.
* **M17 - Ticket Mail Dispatch:** Asynchronous SMTP integration for digital ticket delivery post-booking.
* **M18 - Payments:** Razorpay integration. Webhook validation (`payment.captured`) with HMAC-SHA256 signature verification before ticket issuance.

### Phase 3: Organizer & Gate Operations
* **M5 - Gate Scanner:** UI for paste-entry and event-filtered shift logs.
* **M10 - Gate Camera:** Rear-camera barcode detection API for rapid QR processing.
* **M11 - Door List:** Real-time issued vs. entered metrics for organizers.
* **M13 - Scan Log:** Immutable audit trails for all gate attempts (`approved`, `already_used`, `invalid`, `forbidden`).

### Phase 4: Campus Administration
* **M6 - Campus Admin:** Account directory, role promotion/demotion, and account suspension capabilities.
* **M7 & M12 - Host Desk:** Venue creation, event publishing, editing, and `completed`/`cancelled` state management.
* **M14 - Host Profile:** Committee name assignments for organizers.
* **M15 - Event Attention:** Traffic monitoring and detail-page view counters.
* **M19 - Verification:** Admin-controlled `is_verified` flags required for premium event access.

---

## 📂 Project Architecture

```text
UniTik/
├── backend/
│   ├── core/               # DB connection, Security (CORS/Sessions), Mailer, Payments
│   └── modules/
│       ├── admin/          # Role management, verification, system status
│       ├── auth/           # Login, signup, logout, session hydration
│       ├── events/         # Creation, updating, gate lists, analytics
│       ├── payments/       # Razorpay webhooks and order confirmation
│       └── ticketing/      # Atomic booking, wallet fetching, validation
├── docs/
│   ├── diagrams/           # UML, ERD, DFD, and Sequence Diagrams
│   └── schema.sql          # Supabase PostgreSQL 3NF schema
├── frontend/
│   ├── app/                # Next.js App Router (UI Shell)
│   │   ├── account/        # User settings & password rotation
│   │   ├── admin/          # Campus administrator dashboard
│   │   ├── components/     # Reusable UI (TicketQr, GateCamera, BookingPanel)
│   │   ├── events/         # Dynamic event catalog
│   │   ├── host/           # Organizer workspace
│   │   └── scanner/        # Gate validation interface
│   ├── lib/                # API fetch wrappers and QR generation math
│   └── public/             # Static frontend assets
├── microservices/          # GoLang (Queue) & Python (AI) service pods
├── vendor/                 # PHP Dependencies (Composer)
└── .grokrules.md           # Strict AI Editor system guidelines
```

---

## 🛠️ Local Development Setup

### 1. Database Setup
Execute `docs/schema.sql` in your Supabase SQL Editor to generate the tables and constraints.

### 2. API Environment (PHP / Apache)
Host the UniTik root folder in your local XAMPP htdocs directory. Configure your Supabase connection strings inside `backend/core/db.php`. Ensure Apache is running.

### 3. Frontend Environment (Next.js)
Navigate to the frontend directory and launch the development environment:

```bash
cd frontend
npm install
npm run dev
```

The Next.js UI will be available at `http://localhost:3000`, actively proxying secure requests to your local Apache PHP endpoints.
