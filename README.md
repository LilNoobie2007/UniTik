# 🎟️ UniTik - Campus Event & Ticketing Management System

![Version](https://img.shields.io/badge/Version-1.1_(Production_Ready)-ff003c?style=for-the-badge)
![PHP](https://img.shields.io/badge/PHP_8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_3NF-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Go](https://img.shields.io/badge/Go_1.21-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![CI/CD](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

**Discover. Book. Validate.**  
UniTik is a full-stack campus event management and secure ticketing platform designed to handle student event discovery, organizer management, transactional ticket bookings, and real-time gate validation.

---

## ✨ Core Features
* 🏛️ **Normalized 3NF Architecture:** Strictly structured relational database schema isolating Organizers, Venues, Students, Events, Tickets, and Gate Scan Logs.
* ⚡ **Hybrid API Gateway:** Secure native PHP 8.2 backend modularly handling core business logic, fortified with strict typing and robust PDO Exception handling.
* 🤖 **Microservices Cluster:** Extended backend capabilities utilizing a GoLang service pod for high-speed concurrent booking queues and a Python pod for AI integration.
* 🛡️ **Hardened Security:** Database locked down with strict Row-Level Security (RLS) on Supabase, completely restricting unauthorized public access.
* 🎟️ **Cryptographic Ticketing:** Generates unique ticket hashes paired with automated QR code generation and email receipt dispatch via PHPMailer.
* 🔄 **Automated CI/CD:** GitHub Actions pipeline continuously linting the Next.js frontend and native PHP backend on every main branch commit.

---

## 📂 Project Architecture & Documentation
Comprehensive system design specifications are organized in the `docs/` directory:

**System Diagrams:**
* **ERD:** `docs/diagrams/0_ERD.jpeg`
* **Level 0 DFD:** `docs/diagrams/1_DFD_0.jpeg`
* **Level 1 DFD:** `docs/diagrams/2_DFD_1.jpeg`
* **Class Diagram:** `docs/diagrams/3_CLASS.jpeg`
* **Use Case Diagram:** `docs/diagrams/4_UCD.jpeg`
* **Sequence Diagram:** `docs/diagrams/5_SEQ.jpeg`
* **Activity Diagram:** `docs/diagrams/6_Activity.png`

**Specifications:**
* **Database Schema:** `docs/schema.sql` (PostgreSQL 3NF Definitions)
* **REST API Specs:** `docs/API.md` (Payloads & Endpoints)

---

## 🗂️ Project Structure
```text
UniTik/
├── .github/
│   └── workflows/      # CI/CD linting pipelines (lint.yml)
├── backend/
│   ├── assets/         # System images & generated QR codes
│   ├── core/           # DB connections & SMTP mailer config
│   └── modules/        # Fortified PHP API endpoints (Auth, Events, Ticketing)
├── docs/
│   ├── diagrams/       # UML and System Architecture Diagrams
│   ├── API.md          # Endpoint specifications
│   └── schema.sql      # Supabase 3NF schema and RLS policies
├── frontend/
│   ├── app/            # Next.js App router (Components, API routes, Pages)
│   └── public/         # Static frontend assets
├── microservices/      # Isolated GoLang (Queue) & Python (AI) service pods
├── .env.example        # Environment variable template
├── .cursorrules        # AI Editor system guidelines
└── README.md           # Project documentation