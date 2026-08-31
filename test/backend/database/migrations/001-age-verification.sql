CREATE TABLE IF NOT EXISTS age_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    birthdate DATE NOT NULL,
    age_verified BOOLEAN DEFAULT FALSE,
    parent_email VARCHAR(255),
    consent_token VARCHAR(500) UNIQUE,
    consent_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
