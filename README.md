# 🎟️ UniTik — Campus Event & Ticketing Management System

**Discover. Book. Validate.**

UniTik is a zero-trust campus ticketing platform built to handle student event discovery, multi-tier seat reservations, organizer governance, and atomic door check-in. The Next.js client never communicates directly with the database—all identity is managed via `HttpOnly` sessions, and all transactions are routed through a hardened PHP 8.2 / PDO Backend-For-Frontend (BFF).

---

## 📋 Project Milestones

| Milestone | What It Does | Status |
| :--- | :--- | :---: |
| **Milestone&nbsp;01** | Zero-trust split-table authentication (`students` vs. `organizers`), `HttpOnly` session cookies, CORS whitelist, and login/signup flows | ✔️ |
| **Milestone&nbsp;02** | Relational event publishing and discovery feed with `venues` resolution, ownership checks (`can_manage`), and event CRUD | ✔️ |
| **Milestone&nbsp;03** | Student ticket wallet with QR pass generation, white quiet-zone framing, and fullscreen Gate View modal | ✔️ |
| **Milestone&nbsp;04** | Student-to-organizer elevation pipeline with ID card upload, pending queue, and super-admin approval/rejection | ✔️ |
| **Milestone&nbsp;05** | Editorial Ticket Stub UI system across all routes and deduplicated in-memory `AuthProvider` session state | ✔️ |
| **Milestone&nbsp;06** | Super-admin user directory with role filters, search, and live organizer-to-admin privilege toggling | ✔️ |
| **Milestone&nbsp;07** | Dedicated camera and manual `/scan` gate scanner with atomic `scan_status` claims and `gate_scan_logs` audit trail | ✔️ |
| **Milestone&nbsp;08** | 3NF multi-tier ticketing (`ticket_tiers`) and PDO row-locked (`SELECT ... FOR UPDATE`) concurrency-safe seat booking | ✔️ |
| **Milestone&nbsp;09** | HMAC-SHA256 cryptographic QR token signing and tamper-proof signature verification in `backend/tickets/scan.php` | ✔️ |
| **Milestone&nbsp;10** | Automated transactional email pass delivery and booking receipts via PHPMailer SMTP (`vendor/`) | ❌ |
| **Milestone&nbsp;11** | Python Engine microservice (`microservices/`) for compositing high-resolution downloadable/printable branded QR ticket passes | ❌ |
| **Milestone&nbsp;12** | GoLang Radar microservice (`microservices/`) for real-time gate scan telemetry, live entry rates, and concurrency load monitoring | ❌ |
| **Milestone&nbsp;13** | Brute-force login lockout (`failed_login_attempts`), CSRF token enforcement, and IP/session rate limiting on auth and booking routes | ❌ |
| **Milestone&nbsp;14** | Campus email OTP and `roll_number` verification (`is_verified`) plus self-service password reset (`last_password_change_at`) | ❌ |
| **Milestone&nbsp;15** | Student ticket cancellation, atomic seat release back to `ticket_tiers`, and automated FIFO waitlist promotion | ❌ |
| **Milestone&nbsp;16** | Event discovery search bar, `category_tags` filtering, date sorting, and debounced `page_views` analytics tracking | ❌ |
| **Milestone&nbsp;17** | Organizer live event analytics dashboard with tier revenue, check-in conversion rates, and CSV/PDF attendee roster export | ❌ |
| **Milestone&nbsp;18** | Booking device fingerprinting (`booking_device`), `fraud_risk_score` heuristics, and suspicious activity flags on `/admin` | ❌ |
| **Milestone&nbsp;19** | Offline-capable gate scanner queue with IndexedDB sync for spotty campus Wi-Fi plus audio/haptic scan feedback | ❌ |
| **Milestone&nbsp;20** | Production deployment hardening (Vercel frontend, production PHP-FPM/Nginx BFF, Supabase connection pooling, and automated API/E2E test suite) | ❌ |

---

## 🛡️ Zero-Trust RBAC & Transactional Integrity

* **Split-Table Identity:** `students` and `organizers` exist as strictly separated entities within Supabase PostgreSQL to prevent horizontal privilege escalation. Super-admin privileges are controlled via `organizers.account_status = 'admin'`.
* **Organizer Application Pipeline:** Students cannot bypass UI boundaries to self-promote. They submit a committee application and ID card via `organizer_applications`, subject to super-admin review.
* **Concurrency-Safe Seat Reservations:** `backend/tickets/book.php` locks parent `events` and `ticket_tiers` rows (`SELECT ... FOR UPDATE`) inside a PostgreSQL transaction before checking per-student quotas and remaining tier capacity, preventing overselling under concurrent requests.
* **Atomic Gate Check-In:** `backend/tickets/scan.php` claims tickets with `UPDATE tickets SET scan_status = TRUE WHERE id = :id AND scan_status = FALSE` and writes every `'admitted'` and `'duplicate'` attempt to `gate_scan_logs`.

---

## 📂 Project Architecture

```text
UniTik/
├── backend/
│   ├── admin/          # Super-admin user directory and role assignment endpoints
│   ├── applications/   # Organizer request pipeline and ID card processing
│   ├── assets/         # System images and generated assets
│   ├── core/           # PDO DB connection and Security (CORS/Sessions/RBAC)
│   ├── events/         # Event creation, tier sync, updates, and chronological feeds
│   ├── tickets/        # Transactional booking, student wallet queries, and gate scanning
│   └── uploads/        # Local storage for uploaded organizer ID cards
├── docs/
│   ├── diagrams/       # UML, ERD, and System Architecture Diagrams
│   └── schema.sql      # Master 3NF PostgreSQL / Supabase DDL schema
├── frontend/
│   ├── app/            # Next.js App Router (Editorial Ticket Stub UI)
│   │   ├── admin/      # Super-admin approval queue and user directory
│   │   ├── apply/      # Student-to-organizer application form
│   │   ├── dashboard/  # Account pass overview and workspace links
│   │   ├── events/     # Organizer event and multi-tier management desk
│   │   ├── login/      # Session sign-in form
│   │   ├── scan/       # Live camera and manual gate QR scanner
│   │   ├── signup/     # Student account registration
│   │   └── wallet/     # Student tier selector and digital QR ticket wallet
│   ├── components/     # Shared UI components (Navbar, TicketEventCard)
│   └── lib/            # API fetch wrapper (`api.ts`) and `AuthProvider` (`auth-context.tsx`)
├── microservices/      # Isolated GoLang (Radar) & Python (Engine) worker services
└── vendor/             # PHP dependencies (Composer, PHPMailer)
```

---

## 🛠️ Local Development Setup

### 1. Database Setup
Run `docs/schema.sql` in the Supabase SQL Editor to create all tables, Row Level Security (RLS) rules, constraints, and indexes.

### 2. API Environment (PHP 8.2 / Apache)
1. Place the `UniTik` root directory inside your local XAMPP `htdocs` folder (`C:\xampp\htdocs\UniTik`).
2. Configure your PostgreSQL credentials in `backend/core/db.php`.
3. Start Apache and verify that `backend/uploads/` has write permissions.

### 3. Frontend Environment (Next.js)
```bash
cd frontend
npm install
npm run dev
```
