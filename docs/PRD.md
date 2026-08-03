# Product Requirements Document (PRD) - UniTik

## Chapter 1: Introduction

### 1.1 Background
Contemporary higher education institutions face significant logistical challenges when coordinating campus-wide events, cultural fests, and corporate recruitment drives. Traditional event administration relies heavily on fragmented systems, manual ticketing, and paper-based attendance tracking. This methodology introduces severe vulnerabilities, including proxy attendance during large-scale events, financial discrepancies due to unverified ticket transfers, and operational chaos stemming from decentralized vendor communication. There is a critical need for an automated, unified ecosystem that bridges the gap between administrators, students, and third-party planners to ensure secure, efficient, and transparent operations while handling high-concurrency digital traffic.

### 1.2 Objectives
The primary objectives of the UniTik platform are:
* To engineer a secure, highly scalable event ticketing process that eliminates fraudulent entries through dynamic, cryptographically verifiable QR codes.
* To eradicate proxy attendance by implementing high-precision, location-based geofencing for real-time tracking of volunteers and participants.
* To automate financial reconciliations and marketplace commission splits for multi-tenant organizers using secure payment webhooks.
* To integrate Active Defense DevSecOps mechanisms to proactively neutralize runtime threats such as SQL injection, DDoS exhaustion, and token hijacking.
* To deliver a seamless, high-engagement Progressive Web App (PWA) utilizing a Backend-For-Frontend (BFF) architecture.

### 1.3 Purpose, Scope, and Applicability
**1.3.1 Purpose:** To replace archaic event management workflows with a sophisticated, polyglot microservices architecture acting as a self-governing smart platform for hierarchical access control, secure transactions, and concurrent location tracking.
**1.3.2 Scope:** Encompasses secure user onboarding (RBAC), digital ticket generation, real-time GPS verification, and automated fund distribution. Future scope includes ML pipelines for predictive surge pricing and AI event poster generation.
**1.3.3 Applicability:** Highly applicable to university administration, student councils, corporate campus placement drives, and third-party vendors requiring a centralized logistical hub.

### 1.4 Technical Achievements and Learning Outcomes
* **Mastering Polyglot Systems Engineering:** Orchestrating Next.js, PHP, Python, and GoLang based on strict domain boundaries.
* **Applied DevSecOps and Active Defense:** Engineering proactive security measures, including custom middleware honeypots and database row-level locking.
* **High-Concurrency Spatial Processing:** Utilizing GoLang's Goroutines to execute the Haversine formula concurrently for real-time GPS pings.
* **Cloud Infrastructure:** Utilizing Supabase (PostgreSQL) and Next.js Serverless API routes.
* **Practical Machine Learning Integration:** Deploying Python-based AI models within a live production environment.

## 3-Phase Rollout Plan

### Phase 1: The Navratri MVP (Target: Mid-September 2026)
*   **Frontend:** Next.js UI (Student vs. Organizer RBAC).
*   **Database:** Supabase PostgreSQL setup.
*   **Core Backend (PHP):** Event creation CRUD, Razorpay Webhooks, Dynamic QR Ticket generation.

### Phase 2: The ML Injection (Target: End of October 2026)
*   **Python Service:** AI Event Poster generation (Nano Banana / Gemini), Anti-Fraud Vision (OpenCV), and Bias-Normalized Judging algorithms.

### Phase 3: High-Speed Scaling & Ground Ops (Target: Early December 2026)
*   **GoLang Service:** Geofenced Radar (150-meter Haversine limit) and Live WebSockets for real-time chat.