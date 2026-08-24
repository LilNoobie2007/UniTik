# 🎟️ UniTik - Campus Event & Ticketing Management System

![Version](https://img.shields.io/badge/Version-1.0_(Production_Ready)-ff003c?style=for-the-badge)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**Discover. Book. Validate.**  
UniTik is a full-stack campus event management and secure ticketing platform designed to handle student event discovery, organizer management, transactional ticket bookings, and real-time gate validation.

---

## ✨ Core Features
* 🏛️ **Normalized 3NF Architecture:** Strictly structured relational database schema isolating Organizers, Venues, Students, Events, Tickets, and Gate Scan Logs.
* ⚡ **Hybrid BFF Architecture:** Secure native PHP backend modularly handling business logic while communicating via PDO with a high-performance PostgreSQL cloud database (Supabase).
* 🎟️ **Cryptographic Ticketing:** Generates unique ticket hashes paired with automated QR code generation and email receipt dispatch via PHPMailer.
* 🚪 **Gate Access Control:** Real-time scanning telemetry logging entry validation results and status updates.
* 🔒 **Secure Local & Cloud Sessions:** Token and credential handling ensuring isolated user and organizer roles.

---

## 📂 Project Architecture & Documentation
All formal system design diagrams are organized inside the `docs/diagrams/` directory:
* **ERD:** `docs/diagrams/0_ERD.jpeg`
* **Level 0 DFD:** `docs/diagrams/1_DFD_0.jpeg`
* **Level 1 DFD:** `docs/diagrams/2_DFD_1.jpeg`
* **Class Diagram:** `docs/diagrams/3_CLASS.jpeg`
* **Use Case Diagram:** `docs/diagrams/4_UCD.jpeg`
* **Sequence Diagram:** `docs/diagrams/5_SEQ.jpeg`

---

## 💻 Local Setup & Installation

### 1. Clone the repository
```bash
git clone [https://github.com/LilNoobie2007/UniTik.git](https://github.com/LilNoobie2007/UniTik.git)
cd UniTik


2. Backend Setup (XAMPP / PHP)
Move or clone the project folder directly into your XAMPP htdocs directory:

Bash
# Windows XAMPP path example:
# C:\xampp\htdocs\UniTik
Install backend dependencies using Composer:

Bash
composer install
Configure your Supabase database host, port, and credentials inside backend/core/db.php.

3. Frontend Setup (Next.js)
Navigate into the frontend workspace:

Bash
cd frontend
Install the required Node packages:

Bash
npm install
Run the local development server:

Bash
npm run dev
Open your browser and navigate to http://localhost:3000 to interact with the application.

📜 Version History
v1.0 - Initial Release
Established the 3NF database schema across Supabase.

Built modular PHP BFF backend endpoints for event feeds and ticketing.

Integrated Next.js frontend components for dynamic user interaction.

👨‍💻 Author
Built with 💻 and ☕ by Kevin Makwana.

© UniTik Systems