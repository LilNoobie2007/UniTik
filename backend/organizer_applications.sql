CREATE TABLE organizer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    corporate_details TEXT NOT NULL,
    id_card_path VARCHAR(512) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES organizers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX organizer_applications_one_pending
    ON organizer_applications (user_id)
    WHERE status = 'pending';
