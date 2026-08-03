# 🎟️ UniTik: Polyglot Event & Geofenced Ticketing Platform

> A high-performance, multi-tenant ecosystem for managing campus-wide cultural fests, corporate recruitment drives, and secure digital ticketing. 

## 🚀 Project Overview
UniTik is engineered as a **Feature-Based Modular Monolith**, transitioning beyond standard web applications into a distributed microservices architecture. It is designed to solve critical logistical vulnerabilities in physical event management, including proxy attendance, financial discrepancies, and high-concurrency ticket drops.

## 🧠 Core Architecture
Unitik employs a strict domain-driven tech stack to ensure processing is offloaded to the most efficient language for the task:

* **Frontend (BFF):** **Next.js & React** 
  * Acts as the Backend-For-Frontend orchestration layer. Packaged as a Progressive Web App (PWA) via CapacitorJS for lightweight mobile access.
* **Core Business Logic:** **PHP 8+ & Supabase (PostgreSQL)**
  * Handles standard CRUD operations, Razorpay webhook interceptions, and utilizes strict PDO prepared statements.
* **Spatial & Concurrency Engine (Phase 3):** **GoLang**
  * Built to handle extreme concurrency using Goroutines. Processes live Haversine formula calculations for a strict 150-meter volunteer geofence radar.
* **Intelligence Engine (Phase 2):** **Python FastAPI**
  * Handles Computer Vision (OpenCV) for dynamic QR anti-fraud checks, Gemini-powered generative AI for event posters, and predictive surge pricing.

## 🛡️ DevSecOps & Active Defense
This platform is built with a "Security First" zero-trust mindset:
1. **The "Caught in 4K" Honeypot:** Custom PHP middleware that intercepts SQL injection attempts, immediately blacklists the attacker's IP, and logs their browser fingerprint.
2. **PostgreSQL Row-Level Locking:** Prevents race conditions and overselling during massive "flash sale" ticket drops.
3. **Cryptographic QR Validation:** Time-to-Live (TTL) timestamps encrypted within ticket payloads to neutralize screenshot sharing.
4. **JWT Device Fingerprinting:** Prevents session hijacking by binding authentication tokens to the user's specific hardware signature.

## 📂 Modular Structure
```text
UniTik/
├── frontend/                 # Next.js BFF and React UI components
├── backend/                  # PHP Core
│   ├── core/                 # Database connection & Security middleware
│   └── modules/              # Feature-isolated domains (auth, events, ticketing)
├── microservices/            # Standalone processing engines
│   ├── go-radar/             # High-concurrency GPS engine
│   └── py-engine/            # FastAPI Machine Learning models
└── docs/                     # PRD, Architecture Rules, and SRS