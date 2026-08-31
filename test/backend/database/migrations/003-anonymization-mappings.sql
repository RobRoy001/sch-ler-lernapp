CREATE TABLE IF NOT EXISTS anonymization_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    pseudo_id VARCHAR(500) NOT NULL UNIQUE,
    service VARCHAR(100)
);
