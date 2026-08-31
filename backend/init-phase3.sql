-- ============= PHASE 3 - AI CONTENT PROCESSING SCHEMA =============

-- Tabelle 1: extracted_content (von OCR)
CREATE TABLE IF NOT EXISTS extracted_content (
  id SERIAL PRIMARY KEY,
  source_id INT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  raw_text TEXT,
  text_length INT,
  language VARCHAR(10) DEFAULT 'de',
  page_count INT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_extracted ON extracted_content(source_id);

-- Tabelle 2: analyzed_content (nach OpenAI Analysis)
CREATE TABLE IF NOT EXISTS analyzed_content (
  id SERIAL PRIMARY KEY,
  extracted_content_id INT NOT NULL REFERENCES extracted_content(id) ON DELETE CASCADE,
  concepts JSONB, -- [{name, relevance, difficulty}, ...]
  topics JSONB, -- ['Math', 'Algebra', ...]
  difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
  summary TEXT,
  key_points JSONB,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracted_analyzed ON analyzed_content(extracted_content_id);

-- Tabelle 3: generated_questions (von OpenAI Generator)
CREATE TABLE IF NOT EXISTS generated_questions (
  id SERIAL PRIMARY KEY,
  analyzed_content_id INT NOT NULL REFERENCES analyzed_content(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'fill_gap', 'vocabulary', 'matching', 'short_answer'
  options JSONB, -- [{text, is_correct}, ...] für MC/Matching
  correct_answer VARCHAR(500),
  explanation TEXT,
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  concept_tags JSONB, -- ['concept1', 'concept2']
  quality_score DECIMAL(3,2) DEFAULT 0.50, -- 0.00-1.00
  is_valid BOOLEAN DEFAULT true,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyzed_questions ON generated_questions(analyzed_content_id);
CREATE INDEX IF NOT EXISTS idx_question_type ON generated_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_question_valid ON generated_questions(is_valid);

-- Tabelle 4: tests (final assembled tests)
CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id INT REFERENCES content_sources(id) ON DELETE CASCADE,
  test_type VARCHAR(20) NOT NULL, -- 'quick' (5 questions) oder 'full' (20 questions)
  title VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL, -- array of question IDs + full question data
  total_questions INT NOT NULL,
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  estimated_time INT, -- in minutes
  topics JSONB, -- covered topics
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'completed', 'archived'
  created_at TIMESTAMP DEFAULT NOW(),
  first_attempted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tests ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_test_type ON tests(test_type);
CREATE INDEX IF NOT EXISTS idx_test_status ON tests(status);

-- Tabelle 5: test_submissions (Schüler Antworten)
CREATE TABLE IF NOT EXISTS test_submissions (
  id SERIAL PRIMARY KEY,
  test_id INT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- [{question_id, user_answer, is_correct, time_spent}, ...]
  score INT NOT NULL,
  total_points INT NOT NULL,
  accuracy_percentage DECIMAL(5,2), -- 0.00-100.00
  time_taken INT, -- in seconds
  submitted_at TIMESTAMP DEFAULT NOW(),
  feedback JSONB, -- [{question_id, feedback_text}, ...]
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_submissions ON test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_user_submissions ON test_submissions(user_id);

-- Tabelle 6: processing_jobs (Background Job Tracking)
CREATE TABLE IF NOT EXISTS processing_jobs (
  id SERIAL PRIMARY KEY,
  source_id INT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL, -- 'ocr', 'analysis', 'generation', 'quality_check', 'assembly'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INT DEFAULT 0, -- 0-100
  result JSONB, -- result data
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_jobs ON processing_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON processing_jobs(status);

-- ============= VIEWS & HELPER FUNCTIONS =============

-- View: Test Statistics pro User
CREATE OR REPLACE VIEW user_test_statistics AS
SELECT 
  u.id,
  u.name,
  COUNT(DISTINCT t.id) as total_tests,
  COUNT(DISTINCT ts.id) as attempts,
  ROUND(AVG(ts.accuracy_percentage), 2) as avg_accuracy,
  MAX(ts.submitted_at) as last_attempt
FROM users u
LEFT JOIN tests t ON u.id = t.user_id
LEFT JOIN test_submissions ts ON t.id = ts.test_id
GROUP BY u.id, u.name;

-- Function: Generate Test from Questions
CREATE OR REPLACE FUNCTION create_test_from_questions(
  p_user_id INT,
  p_source_id INT,
  p_test_type VARCHAR,
  p_question_count INT
)
RETURNS TABLE (
  test_id INT,
  success BOOLEAN,
  message VARCHAR
) AS $$
DECLARE
  v_test_id INT;
  v_questions JSONB;
  v_difficulty VARCHAR;
BEGIN
  -- Get top-quality questions
  SELECT json_agg(
    json_build_object(
      'id', id,
      'question_text', question_text,
      'type', question_type,
      'options', options,
      'correct_answer', correct_answer,
      'difficulty', difficulty
    ) ORDER BY quality_score DESC
  ) INTO v_questions
  FROM generated_questions
  WHERE analyzed_content_id IN (
    SELECT id FROM analyzed_content 
    WHERE extracted_content_id IN (
      SELECT id FROM extracted_content 
      WHERE source_id = p_source_id
    )
  )
  AND is_valid = true
  LIMIT p_question_count;

  -- Get difficulty from questions
  SELECT difficulty_level INTO v_difficulty
  FROM analyzed_content
  WHERE extracted_content_id IN (
    SELECT id FROM extracted_content 
    WHERE source_id = p_source_id
  )
  LIMIT 1;

  -- Create test
  INSERT INTO tests (user_id, source_id, test_type, title, questions, total_questions, difficulty, estimated_time, status)
  VALUES (
    p_user_id,
    p_source_id,
    p_test_type,
    CASE 
      WHEN p_test_type = 'quick' THEN 'Quick Test - ' || to_char(NOW(), 'DD.MM.YYYY')
      ELSE 'Full Test - ' || to_char(NOW(), 'DD.MM.YYYY')
    END,
    v_questions,
    p_question_count,
    v_difficulty,
    CASE WHEN p_test_type = 'quick' THEN 10 ELSE 30 END,
    'available'
  )
  RETURNING tests.id INTO v_test_id;

  RETURN QUERY SELECT v_test_id, true, 'Test created successfully'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- ============= END PHASE 3 SCHEMA =============