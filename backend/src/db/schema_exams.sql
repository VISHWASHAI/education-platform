-- Exam & Grading Suite (adds onto the core schema).

CREATE TYPE question_type AS ENUM ('mcq', 'short_text', 'long_text', 'essay');
CREATE TYPE exam_type AS ENUM ('quiz', 'midterm', 'final', 'assignment', 'practice_test');
CREATE TYPE exam_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE submission_status AS ENUM ('in_progress', 'submitted', 'graded');

-- Reusable question bank; a question can be attached to many exams via exam_questions.
CREATE TABLE IF NOT EXISTS question_bank (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id),
  subject TEXT,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options JSONB,              -- for mcq: [{ "key": "A", "text": "..." }, ...]
  correct_answer TEXT,        -- for mcq: the correct option key
  default_marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  exam_type exam_type NOT NULL DEFAULT 'quiz',
  status exam_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES question_bank(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  UNIQUE (exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS exam_submissions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status submission_status NOT NULL DEFAULT 'submitted',
  total_score NUMERIC(7,2),
  max_score NUMERIC(7,2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS submission_answers (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
  exam_question_id INTEGER NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  score NUMERIC(6,2),
  feedback TEXT,
  UNIQUE (submission_id, exam_question_id)
);

CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id);
