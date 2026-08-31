-- UniTik 3NF Database Schema Specification

CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    committee_name VARCHAR(100),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_name VARCHAR(100) NOT NULL,
    location_details TEXT NOT NULL,
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    ticket_price NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'published',
    page_views INTEGER DEFAULT 0,
    category_tags VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    ticket_hash VARCHAR(64) UNIQUE NOT NULL,
    scan_status BOOLEAN DEFAULT FALSE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    booking_device VARCHAR(100),
    fraud_risk_score NUMERIC(3, 2) DEFAULT 0.00
);

CREATE TABLE gate_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    gate_identifier VARCHAR(50) NOT NULL,
    scan_result VARCHAR(50) NOT NULL
);

-- Indexes for high-frequency queries
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_tickets_hash ON tickets(ticket_hash);
CREATE INDEX idx_gate_logs_ticket ON gate_scan_logs(ticket_id);