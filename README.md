# 🎟️ UniTik - Campus Event & Ticketing Management System

![Version](https://img.shields.io/badge/Version-2.2_(Zero_Trust_Core)-ff003c?style=for-the-badge)
![PHP](https://img.shields.io/badge/PHP_8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Discover. Book. Validate.**  
UniTik is a highly secure, zero-trust campus ticketing platform designed to handle student event discovery, organizer management, and ticket bookings. Built with a strict separation of concerns, the Next.js client never communicates directly with the database. All identity is managed via HttpOnly sessions, and all data transactions are routed through a hardened PHP/PDO Backend-For-Frontend (BFF).

---

## 🛡️ Zero-Trust RBAC & Dual-Identity Architecture
* **Split-Table Design:** `students` and `organizers` exist as strictly separated entities within Supabase PostgreSQL to prevent horizontal privilege escalation.
* **Dual-Identity Sessions:** A single user can hold both Student and Organizer IDs simultaneously within their secure PHP HttpOnly session cookie, allowing seamless context-switching between the personal Ticket Wallet and the Organizer Dashboard without re-authenticating.
* **Organizer Application Pipeline:** Students cannot bypass UI boundaries to force admin privileges. They must submit a formal application and physical ID card via the `organizer_applications` API pipeline, which is subject to Super-Admin approval.

---

## 📂 Project Architecture

```text
UniTik/
├── backend/
│   ├── admin/              # Super-Admin controls and role assignments
│   ├── applications/       # Organizer request pipeline and ID processing
│   ├── assets/             # System images and generated assets
│   ├── core/               # DB connection, Security (CORS/Sessions/RBAC)
│   ├── events/             # Event creation, updating, and chronological feeds
│   ├── tickets/            # Ticket generation and atomic booking logic
│   └── uploads/            # Secure local storage for organizer ID cards
├── docs/
│   └── diagrams/           # UML, ERD, and System Architecture Diagrams
├── frontend/
│   ├── app/                # Next.js App Router (UI Shell)
│   │   ├── admin/          # Campus administrator dashboard
│   │   ├── apply/          # Student-to-Organizer application form
│   │   ├── dashboard/      # Unified event discovery feed
│   │   ├── events/         # Dynamic event details and booking
│   │   ├── login/          # Secure student/organizer login
│   │   ├── signup/         # Student registration
│   │   └── wallet/         # Digital student ticket wallet
│   ├── components/         # Reusable UI elements (Navbar, Cards, Modals)
│   └── lib/                # API fetch wrappers and core utilities
├── microservices/          # Isolated GoLang (Radar) & Python (Engine) experimental pods
└── vendor/                 # PHP Dependencies (Composer, QR Code libraries)
```

---

## 🛠️ Local Development Setup

### 1. Database Setup
Execute the core SQL schema (including the `organizer_applications` pipeline) in your Supabase SQL Editor to generate the tables and constraints.

### 2. API Environment (PHP / Apache)
Host the UniTik root folder in your local XAMPP htdocs directory. Configure your Supabase connection strings inside `backend/core/db.php`. Ensure Apache is running and that the `backend/uploads/` directory exists with write permissions for ID cards.

### 3. Frontend Environment (Next.js)
Navigate to the frontend directory and launch the development environment:

```bash
cd frontend
npm install
npm run dev
```
The Next.js UI will be available at `http://localhost:3000`, actively proxying secure requests to your local Apache PHP endpoints.

---

## 🚀 Finalizing Deployment
Commit this as your final push for the day:

```bash
git add README.md
git commit -m "docs: regenerate README to reflect Zero-Trust Core architecture and updated directory tree"
git push origin main
```
