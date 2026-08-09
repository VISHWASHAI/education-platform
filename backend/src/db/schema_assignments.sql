-- Assignments (adds onto the core schema).

CREATE TYPE assignment_status AS ENUM ('draft', 'published');
CREATE TYPE assignment_submission_status AS ENUM ('submitted', 'late', 'graded');

CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  status assignment_status NOT NULL DEFAULT 'draft',
  due_at TIMESTAMPTZ,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status assignment_submission_status NOT NULL DEFAULT 'submitted',
  score NUMERIC(6,2),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
