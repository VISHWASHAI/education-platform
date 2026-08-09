-- Financial Management (adds onto the core schema).

CREATE TYPE fee_status AS ENUM ('unpaid', 'partial', 'paid');
CREATE TYPE payment_method AS ENUM ('cash', 'check', 'online', 'bank_transfer');

CREATE TABLE IF NOT EXISTS fee_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,       -- Tuition, Exam, Transport, Library, ...
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_category_id INTEGER NOT NULL REFERENCES fee_categories(id),
  amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  status fee_status NOT NULL DEFAULT 'unpaid',
  due_date DATE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  student_fee_id INTEGER NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method payment_method NOT NULL,
  receipt_no TEXT UNIQUE NOT NULL,
  recorded_by INTEGER REFERENCES users(id),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_payments_student_fee ON payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
