-- ============================================================================
-- UniTik Master Database Schema (PostgreSQL / Supabase)
-- Architecture: Split-Table Zero-Trust RBAC & Multi-Tier Ticketing (3NF)
-- ============================================================================

-- 1. Students Cohort Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'Active',
    failed_login_attempts INTEGER DEFAULT 0,
    last_password_change_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Organizers & Super-Admin Table
-- Note: Super-Admin privileges are granted when account_status = 'admin'
CREATE TABLE IF NOT EXISTS public.organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    committee_name VARCHAR(100) DEFAULT 'General',
    account_status VARCHAR(20) DEFAULT 'Active',
    failed_login_attempts INTEGER DEFAULT 0,
    last_password_change_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Campus Venues Directory
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_name VARCHAR(200) NOT NULL,
    location_details TEXT,
    venue_url TEXT,
    max_capacity INTEGER NOT NULL DEFAULT 200
);

-- 4. Published Campus Events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ticket_price NUMERIC(10, 2) DEFAULT 0.00,
    image_url TEXT,
    max_tickets_per_user INTEGER NOT NULL DEFAULT 5 CHECK (max_tickets_per_user BETWEEN 1 AND 10),
    event_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'published',
    page_views INTEGER DEFAULT 0,
    category_tags VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 3NF Multi-Tier Ticket Pools
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, name)
);

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- 6. Cryptographic Student Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.ticket_tiers(id) ON DELETE RESTRICT,
    ticket_hash VARCHAR(128) NOT NULL UNIQUE,
    scan_status BOOLEAN DEFAULT FALSE,
    booking_device VARCHAR(100),
    fraud_risk_score NUMERIC(5, 2) DEFAULT 0.00,
    issued_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Immutable Gate Validation Audit Logs
CREATE TABLE IF NOT EXISTS public.gate_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT now(),
    gate_identifier VARCHAR(100) NOT NULL,
    scan_result VARCHAR(50) NOT NULL
);

-- 8. Student-to-Organizer Elevation Pipeline
CREATE TABLE IF NOT EXISTS public.organizer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    corporate_details TEXT NOT NULL,
    id_card_path VARCHAR(512) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.organizers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enforce a single active pending request per student
CREATE UNIQUE INDEX IF NOT EXISTS organizer_applications_one_pending
    ON public.organizer_applications (user_id)
    WHERE status = 'pending';

-- Performance & Concurrency Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event_id
    ON public.ticket_tiers (event_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_tickets_tier_id
    ON public.tickets (tier_id);

CREATE INDEX IF NOT EXISTS idx_tickets_event_student
    ON public.tickets (event_id, student_id);