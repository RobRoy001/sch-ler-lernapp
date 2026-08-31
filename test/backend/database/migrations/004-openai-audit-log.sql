CREATE TABLE IF NOT EXISTS openai_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudo_id VARCHAR(500),
    request_type VARCHAR(100),
    response_status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
