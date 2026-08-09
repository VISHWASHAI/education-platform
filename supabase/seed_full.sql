-- Full demo dataset covering every module: extra staff roles, more classes/students
-- with logins, fees + payments, exams with graded submissions, assignments with
-- submissions, attendance history, announcements, and messaging.
--
-- Safe to re-run — every insert is keyed off a unique natural key with ON CONFLICT
-- DO NOTHING (or a WHERE NOT EXISTS guard where there's no unique constraint to hook).
--
-- All new demo accounts share the password: Demo@123
-- (admin@eduflow.test keeps its own password: Admin@123, set by supabase/seed.sql)

-- ============================================================
-- 1. STAFF USERS (head_master, office_admin, group_coordinator, teachers)
-- ============================================================

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Priya Sharma', 'headmaster@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'head_master'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Rakesh Verma', 'office@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'office_admin'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Anjali Nair', 'coordinator@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'group_coordinator'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Arjun Mehta', 'arjun.mehta@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'teacher'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Kavya Iyer', 'kavya.iyer@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'teacher'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Rohan Das', 'rohan.das@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'teacher'
ON CONFLICT (email) DO NOTHING;

INSERT INTO teachers (user_id, department, specialization)
SELECT id, 'Mathematics', 'Algebra' FROM users WHERE email = 'arjun.mehta@eduflow.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teachers (user_id, department, specialization)
SELECT id, 'Science', 'Physics' FROM users WHERE email = 'kavya.iyer@eduflow.test'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teachers (user_id, department, specialization)
SELECT id, 'English', 'Literature' FROM users WHERE email = 'rohan.das@eduflow.test'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. CLASSES (Grade 8 - A already exists from seed.sql; add two more)
-- ============================================================

UPDATE classes SET lead_teacher_id = (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
WHERE name = 'Grade 8' AND section = 'A';

INSERT INTO classes (name, section, lead_teacher_id)
SELECT 'Grade 9', 'B', (SELECT id FROM users WHERE email = 'kavya.iyer@eduflow.test')
ON CONFLICT (name, section) DO NOTHING;

INSERT INTO classes (name, section, lead_teacher_id)
SELECT 'Grade 10', 'C', (SELECT id FROM users WHERE email = 'rohan.das@eduflow.test')
ON CONFLICT (name, section) DO NOTHING;

-- ============================================================
-- 3. STUDENT LOGINS (give the 3 existing seed.sql students real accounts)
-- ============================================================

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Ava Thompson', 'ava.thompson@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
UPDATE students SET user_id = (SELECT id FROM users WHERE email = 'ava.thompson@eduflow.test')
WHERE admission_no = 'ADM-1001' AND user_id IS NULL;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Liam Chen', 'liam.chen@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
UPDATE students SET user_id = (SELECT id FROM users WHERE email = 'liam.chen@eduflow.test')
WHERE admission_no = 'ADM-1002' AND user_id IS NULL;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Sofia Rossi', 'sofia.rossi@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id
FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
UPDATE students SET user_id = (SELECT id FROM users WHERE email = 'sofia.rossi@eduflow.test')
WHERE admission_no = 'ADM-1003' AND user_id IS NULL;

-- ============================================================
-- 4. MORE STUDENTS (Grade 9 - B and Grade 10 - C), each with a login
-- ============================================================

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Emma Wilson', 'emma.wilson@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, user_id)
SELECT 'ADM-2001', 'Emma Wilson', c.id, 'David Wilson', '555-0201', (SELECT id FROM users WHERE email = 'emma.wilson@eduflow.test')
FROM classes c WHERE c.name = 'Grade 9' AND c.section = 'B'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Noah Patel', 'noah.patel@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, user_id)
SELECT 'ADM-2002', 'Noah Patel', c.id, 'Raj Patel', '555-0202', (SELECT id FROM users WHERE email = 'noah.patel@eduflow.test')
FROM classes c WHERE c.name = 'Grade 9' AND c.section = 'B'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Mia Fernandes', 'mia.fernandes@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, user_id)
SELECT 'ADM-2003', 'Mia Fernandes', c.id, 'Carlos Fernandes', '555-0203', (SELECT id FROM users WHERE email = 'mia.fernandes@eduflow.test')
FROM classes c WHERE c.name = 'Grade 9' AND c.section = 'B'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Aditya Rao', 'aditya.rao@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, user_id)
SELECT 'ADM-3001', 'Aditya Rao', c.id, 'Suresh Rao', '555-0301', (SELECT id FROM users WHERE email = 'aditya.rao@eduflow.test')
FROM classes c WHERE c.name = 'Grade 10' AND c.section = 'C'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Zara Khan', 'zara.khan@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, user_id)
SELECT 'ADM-3002', 'Zara Khan', c.id, 'Imran Khan', '555-0302', (SELECT id FROM users WHERE email = 'zara.khan@eduflow.test')
FROM classes c WHERE c.name = 'Grade 10' AND c.section = 'C'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'Kabir Singh', 'kabir.singh@eduflow.test', '$2a$10$8x76nPDyrLNF8.AY4L182uDoIuGyrpFNmQAXfaWjt9txk5sFHkz.6', id FROM roles WHERE name = 'student'
ON CONFLICT (email) DO NOTHING;
INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact, user_id)
SELECT 'ADM-3003', 'Kabir Singh', c.id, 'Harpreet Singh', '555-0303', (SELECT id FROM users WHERE email = 'kabir.singh@eduflow.test')
FROM classes c WHERE c.name = 'Grade 10' AND c.section = 'C'
ON CONFLICT (admission_no) DO NOTHING;

-- ============================================================
-- 5. FEE CATEGORIES, FEES, PAYMENTS
-- ============================================================

INSERT INTO fee_categories (name, description) VALUES
  ('Tuition Fee', 'Annual tuition fee'),
  ('Exam Fee', 'Term examination fee'),
  ('Transport Fee', 'School bus transport'),
  ('Library Fee', 'Library access and materials')
ON CONFLICT (name) DO NOTHING;

-- Tuition fee assigned to every student
INSERT INTO student_fees (student_id, fee_category_id, amount, due_date, created_by)
SELECT s.id, (SELECT id FROM fee_categories WHERE name = 'Tuition Fee'), 15000.00,
       CURRENT_DATE + INTERVAL '30 days', (SELECT id FROM users WHERE email = 'admin@eduflow.test')
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM student_fees sf
  WHERE sf.student_id = s.id AND sf.fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Tuition Fee')
);

-- Transport fee assigned to every student
INSERT INTO student_fees (student_id, fee_category_id, amount, due_date, created_by)
SELECT s.id, (SELECT id FROM fee_categories WHERE name = 'Transport Fee'), 3000.00,
       CURRENT_DATE + INTERVAL '20 days', (SELECT id FROM users WHERE email = 'admin@eduflow.test')
FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM student_fees sf
  WHERE sf.student_id = s.id AND sf.fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Transport Fee')
);

-- Ava Thompson: tuition fully paid
INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
SELECT sf.id, 15000.00, 'online', 'RCPT-DEMO-0001', (SELECT id FROM users WHERE email = 'office@eduflow.test')
FROM student_fees sf
JOIN students s ON s.id = sf.student_id
WHERE s.admission_no = 'ADM-1001' AND sf.fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Tuition Fee')
ON CONFLICT (receipt_no) DO NOTHING;

UPDATE student_fees SET amount_paid = 15000.00, status = 'paid'
WHERE student_id = (SELECT id FROM students WHERE admission_no = 'ADM-1001')
  AND fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Tuition Fee');

-- Liam Chen: tuition partially paid
INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
SELECT sf.id, 7000.00, 'cash', 'RCPT-DEMO-0002', (SELECT id FROM users WHERE email = 'office@eduflow.test')
FROM student_fees sf
JOIN students s ON s.id = sf.student_id
WHERE s.admission_no = 'ADM-1002' AND sf.fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Tuition Fee')
ON CONFLICT (receipt_no) DO NOTHING;

UPDATE student_fees SET amount_paid = 7000.00, status = 'partial'
WHERE student_id = (SELECT id FROM students WHERE admission_no = 'ADM-1002')
  AND fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Tuition Fee');

-- Sofia Rossi: transport fee fully paid
INSERT INTO payments (student_fee_id, amount, method, receipt_no, recorded_by)
SELECT sf.id, 3000.00, 'bank_transfer', 'RCPT-DEMO-0003', (SELECT id FROM users WHERE email = 'office@eduflow.test')
FROM student_fees sf
JOIN students s ON s.id = sf.student_id
WHERE s.admission_no = 'ADM-1003' AND sf.fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Transport Fee')
ON CONFLICT (receipt_no) DO NOTHING;

UPDATE student_fees SET amount_paid = 3000.00, status = 'paid'
WHERE student_id = (SELECT id FROM students WHERE admission_no = 'ADM-1003')
  AND fee_category_id = (SELECT id FROM fee_categories WHERE name = 'Transport Fee');

-- ============================================================
-- 6. QUESTION BANK
-- ============================================================

INSERT INTO question_bank (class_id, subject, question_text, question_type, options, correct_answer, default_marks, created_by)
SELECT c.id, 'Mathematics', 'What is 12 x 8?', 'mcq',
       '[{"key":"0","text":"96"},{"key":"1","text":"84"},{"key":"2","text":"108"},{"key":"3","text":"102"}]'::jsonb,
       '0', 2, (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
AND NOT EXISTS (SELECT 1 FROM question_bank WHERE question_text = 'What is 12 x 8?');

INSERT INTO question_bank (class_id, subject, question_text, question_type, options, correct_answer, default_marks, created_by)
SELECT c.id, 'Mathematics', 'Solve for x: 2x + 3 = 11', 'mcq',
       '[{"key":"0","text":"3"},{"key":"1","text":"4"},{"key":"2","text":"5"},{"key":"3","text":"6"}]'::jsonb,
       '1', 2, (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
AND NOT EXISTS (SELECT 1 FROM question_bank WHERE question_text = 'Solve for x: 2x + 3 = 11');

INSERT INTO question_bank (class_id, subject, question_text, question_type, options, correct_answer, default_marks, created_by)
SELECT c.id, 'Science', 'What planet is known as the Red Planet?', 'mcq',
       '[{"key":"0","text":"Earth"},{"key":"1","text":"Mars"},{"key":"2","text":"Jupiter"},{"key":"3","text":"Venus"}]'::jsonb,
       '1', 2, (SELECT id FROM users WHERE email = 'kavya.iyer@eduflow.test')
FROM classes c WHERE c.name = 'Grade 9' AND c.section = 'B'
AND NOT EXISTS (SELECT 1 FROM question_bank WHERE question_text = 'What planet is known as the Red Planet?');

INSERT INTO question_bank (class_id, subject, question_text, question_type, options, correct_answer, default_marks, created_by)
SELECT c.id, 'Science', 'Water boils at what temperature (Celsius) at sea level?', 'mcq',
       '[{"key":"0","text":"90"},{"key":"1","text":"100"},{"key":"2","text":"110"},{"key":"3","text":"120"}]'::jsonb,
       '1', 2, (SELECT id FROM users WHERE email = 'kavya.iyer@eduflow.test')
FROM classes c WHERE c.name = 'Grade 9' AND c.section = 'B'
AND NOT EXISTS (SELECT 1 FROM question_bank WHERE question_text = 'Water boils at what temperature (Celsius) at sea level?');

INSERT INTO question_bank (class_id, subject, question_text, question_type, default_marks, created_by)
SELECT c.id, 'English', 'Write a short paragraph about your favorite book.', 'essay', 10,
       (SELECT id FROM users WHERE email = 'rohan.das@eduflow.test')
FROM classes c WHERE c.name = 'Grade 10' AND c.section = 'C'
AND NOT EXISTS (SELECT 1 FROM question_bank WHERE question_text = 'Write a short paragraph about your favorite book.');

-- ============================================================
-- 7. EXAMS + QUESTIONS + SUBMISSIONS (graded)
-- ============================================================

INSERT INTO exams (title, description, class_id, exam_type, status, ends_at, created_by)
SELECT 'Midterm Mathematics', 'Covers chapters 1-4.', c.id, 'midterm', 'published',
       now() + interval '14 days', (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
AND NOT EXISTS (SELECT 1 FROM exams WHERE title = 'Midterm Mathematics');

INSERT INTO exam_questions (exam_id, question_id, order_index, marks)
SELECT e.id, q.id, 0, q.default_marks
FROM exams e, question_bank q
WHERE e.title = 'Midterm Mathematics' AND q.question_text = 'What is 12 x 8?'
ON CONFLICT (exam_id, question_id) DO NOTHING;

INSERT INTO exam_questions (exam_id, question_id, order_index, marks)
SELECT e.id, q.id, 1, q.default_marks
FROM exams e, question_bank q
WHERE e.title = 'Midterm Mathematics' AND q.question_text = 'Solve for x: 2x + 3 = 11'
ON CONFLICT (exam_id, question_id) DO NOTHING;

INSERT INTO exams (title, description, class_id, exam_type, status, ends_at, created_by)
SELECT 'Science Quiz', 'Quick quiz on general science.', c.id, 'quiz', 'published',
       now() + interval '10 days', (SELECT id FROM users WHERE email = 'kavya.iyer@eduflow.test')
FROM classes c WHERE c.name = 'Grade 9' AND c.section = 'B'
AND NOT EXISTS (SELECT 1 FROM exams WHERE title = 'Science Quiz');

INSERT INTO exam_questions (exam_id, question_id, order_index, marks)
SELECT e.id, q.id, 0, q.default_marks
FROM exams e, question_bank q
WHERE e.title = 'Science Quiz' AND q.question_text = 'What planet is known as the Red Planet?'
ON CONFLICT (exam_id, question_id) DO NOTHING;

INSERT INTO exam_questions (exam_id, question_id, order_index, marks)
SELECT e.id, q.id, 1, q.default_marks
FROM exams e, question_bank q
WHERE e.title = 'Science Quiz' AND q.question_text = 'Water boils at what temperature (Celsius) at sea level?'
ON CONFLICT (exam_id, question_id) DO NOTHING;

-- Ava Thompson submits Midterm Mathematics — both correct, fully graded
INSERT INTO exam_submissions (exam_id, student_id, status, total_score, max_score, graded_at)
SELECT e.id, s.id, 'graded', 4, 4, now()
FROM exams e, students s
WHERE e.title = 'Midterm Mathematics' AND s.admission_no = 'ADM-1001'
ON CONFLICT (exam_id, student_id) DO NOTHING;

INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
SELECT sub.id, eq.id, '0', true, eq.marks
FROM exam_submissions sub
JOIN exams e ON e.id = sub.exam_id
JOIN students s ON s.id = sub.student_id AND s.admission_no = 'ADM-1001'
JOIN exam_questions eq ON eq.exam_id = e.id
JOIN question_bank q ON q.id = eq.question_id AND q.question_text = 'What is 12 x 8?'
WHERE e.title = 'Midterm Mathematics'
ON CONFLICT (submission_id, exam_question_id) DO NOTHING;

INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
SELECT sub.id, eq.id, '1', true, eq.marks
FROM exam_submissions sub
JOIN exams e ON e.id = sub.exam_id
JOIN students s ON s.id = sub.student_id AND s.admission_no = 'ADM-1001'
JOIN exam_questions eq ON eq.exam_id = e.id
JOIN question_bank q ON q.id = eq.question_id AND q.question_text = 'Solve for x: 2x + 3 = 11'
WHERE e.title = 'Midterm Mathematics'
ON CONFLICT (submission_id, exam_question_id) DO NOTHING;

-- Liam Chen submits Midterm Mathematics — one wrong, one right
INSERT INTO exam_submissions (exam_id, student_id, status, total_score, max_score, graded_at)
SELECT e.id, s.id, 'graded', 2, 4, now()
FROM exams e, students s
WHERE e.title = 'Midterm Mathematics' AND s.admission_no = 'ADM-1002'
ON CONFLICT (exam_id, student_id) DO NOTHING;

INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
SELECT sub.id, eq.id, '1', false, 0
FROM exam_submissions sub
JOIN exams e ON e.id = sub.exam_id
JOIN students s ON s.id = sub.student_id AND s.admission_no = 'ADM-1002'
JOIN exam_questions eq ON eq.exam_id = e.id
JOIN question_bank q ON q.id = eq.question_id AND q.question_text = 'What is 12 x 8?'
WHERE e.title = 'Midterm Mathematics'
ON CONFLICT (submission_id, exam_question_id) DO NOTHING;

INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
SELECT sub.id, eq.id, '1', true, eq.marks
FROM exam_submissions sub
JOIN exams e ON e.id = sub.exam_id
JOIN students s ON s.id = sub.student_id AND s.admission_no = 'ADM-1002'
JOIN exam_questions eq ON eq.exam_id = e.id
JOIN question_bank q ON q.id = eq.question_id AND q.question_text = 'Solve for x: 2x + 3 = 11'
WHERE e.title = 'Midterm Mathematics'
ON CONFLICT (submission_id, exam_question_id) DO NOTHING;

-- Emma Wilson submits Science Quiz — both correct
INSERT INTO exam_submissions (exam_id, student_id, status, total_score, max_score, graded_at)
SELECT e.id, s.id, 'graded', 4, 4, now()
FROM exams e, students s
WHERE e.title = 'Science Quiz' AND s.admission_no = 'ADM-2001'
ON CONFLICT (exam_id, student_id) DO NOTHING;

INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
SELECT sub.id, eq.id, '1', true, eq.marks
FROM exam_submissions sub
JOIN exams e ON e.id = sub.exam_id
JOIN students s ON s.id = sub.student_id AND s.admission_no = 'ADM-2001'
JOIN exam_questions eq ON eq.exam_id = e.id
JOIN question_bank q ON q.id = eq.question_id AND q.question_text = 'What planet is known as the Red Planet?'
WHERE e.title = 'Science Quiz'
ON CONFLICT (submission_id, exam_question_id) DO NOTHING;

INSERT INTO submission_answers (submission_id, exam_question_id, answer_text, is_correct, score)
SELECT sub.id, eq.id, '1', true, eq.marks
FROM exam_submissions sub
JOIN exams e ON e.id = sub.exam_id
JOIN students s ON s.id = sub.student_id AND s.admission_no = 'ADM-2001'
JOIN exam_questions eq ON eq.exam_id = e.id
JOIN question_bank q ON q.id = eq.question_id AND q.question_text = 'Water boils at what temperature (Celsius) at sea level?'
WHERE e.title = 'Science Quiz'
ON CONFLICT (submission_id, exam_question_id) DO NOTHING;

-- ============================================================
-- 8. ASSIGNMENTS + SUBMISSIONS
-- ============================================================

INSERT INTO assignments (title, description, class_id, status, due_at, max_score, created_by)
SELECT 'Algebra Homework', 'Complete problems 1-20 in Chapter 3.', c.id, 'published',
       now() + interval '7 days', 100, (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
AND NOT EXISTS (SELECT 1 FROM assignments WHERE title = 'Algebra Homework');

INSERT INTO assignment_submissions (assignment_id, student_id, content, status)
SELECT a.id, s.id, 'Completed all 20 problems, work attached.', 'submitted'
FROM assignments a, students s
WHERE a.title = 'Algebra Homework' AND s.admission_no = 'ADM-1001'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

INSERT INTO assignment_submissions (assignment_id, student_id, content, status, score, feedback, graded_at)
SELECT a.id, s.id, 'Finished most problems, a couple left incomplete.', 'graded', 78, 'Good effort — review problem 14 (factoring).', now()
FROM assignments a, students s
WHERE a.title = 'Algebra Homework' AND s.admission_no = 'ADM-1002'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

INSERT INTO assignments (title, description, class_id, status, due_at, max_score, created_by)
SELECT 'Essay: My Favorite Book', 'Write a 300-word essay on your favorite book and why you enjoyed it.', c.id, 'published',
       now() + interval '10 days', 50, (SELECT id FROM users WHERE email = 'rohan.das@eduflow.test')
FROM classes c WHERE c.name = 'Grade 10' AND c.section = 'C'
AND NOT EXISTS (SELECT 1 FROM assignments WHERE title = 'Essay: My Favorite Book');

INSERT INTO assignment_submissions (assignment_id, student_id, content, status)
SELECT a.id, s.id, 'My essay is about "To Kill a Mockingbird" — draft attached via shared doc link.', 'submitted'
FROM assignments a, students s
WHERE a.title = 'Essay: My Favorite Book' AND s.admission_no = 'ADM-3001'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- ============================================================
-- 9. ATTENDANCE (last 5 days, Grade 8 - A and Grade 9 - B)
-- ============================================================

INSERT INTO attendance (student_id, class_id, date, status, marked_by)
SELECT s.id, s.class_id, d::date, 'present', (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
FROM students s
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE, INTERVAL '1 day') AS d
WHERE s.admission_no IN ('ADM-1001', 'ADM-1003')
ON CONFLICT (student_id, date) DO NOTHING;

INSERT INTO attendance (student_id, class_id, date, status, marked_by)
SELECT s.id, s.class_id, d::date,
       (CASE WHEN d::date = CURRENT_DATE - INTERVAL '2 days' THEN 'absent'
            WHEN d::date = CURRENT_DATE - INTERVAL '1 days' THEN 'late'
            ELSE 'present' END)::attendance_status,
       (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
FROM students s
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE, INTERVAL '1 day') AS d
WHERE s.admission_no = 'ADM-1002'
ON CONFLICT (student_id, date) DO NOTHING;

INSERT INTO attendance (student_id, class_id, date, status, marked_by)
SELECT s.id, s.class_id, d::date, 'present', (SELECT id FROM users WHERE email = 'kavya.iyer@eduflow.test')
FROM students s
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE, INTERVAL '1 day') AS d
WHERE s.admission_no IN ('ADM-2001', 'ADM-2002', 'ADM-2003')
ON CONFLICT (student_id, date) DO NOTHING;

-- ============================================================
-- 10. ANNOUNCEMENTS
-- ============================================================

INSERT INTO announcements (title, body, target_role, target_class_id, is_pinned, status, created_by)
SELECT 'Welcome to the New Semester', 'We''re excited to kick off the new semester! Please check your class schedules and reach out to your class teacher with any questions.',
       NULL, NULL, true, 'published', (SELECT id FROM users WHERE email = 'headmaster@eduflow.test')
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Welcome to the New Semester');

INSERT INTO announcements (title, body, target_role, target_class_id, is_pinned, status, created_by)
SELECT 'Grade 8 Parent-Teacher Meeting', 'The parent-teacher meeting for Grade 8 - A is scheduled for next Friday at 4 PM in the main hall.',
       NULL, (SELECT id FROM classes WHERE name = 'Grade 8' AND section = 'A'), false, 'published',
       (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test')
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Grade 8 Parent-Teacher Meeting');

INSERT INTO announcements (title, body, target_role, target_class_id, is_pinned, status, created_by)
SELECT 'Staff Meeting Reminder', 'Reminder: all teaching staff meeting this Monday at 8 AM in the staff room.',
       'teacher', NULL, false, 'published', (SELECT id FROM users WHERE email = 'headmaster@eduflow.test')
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Staff Meeting Reminder');

-- ============================================================
-- 11. MESSAGING (a direct conversation + a class group chat)
-- ============================================================

DO $$
DECLARE
  v_conv_id INTEGER;
  v_arjun_id INTEGER := (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test');
  v_ava_id INTEGER := (SELECT id FROM users WHERE email = 'ava.thompson@eduflow.test');
BEGIN
  SELECT c.id INTO v_conv_id
  FROM conversations c
  JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = v_arjun_id
  JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = v_ava_id
  WHERE c.type = 'direct';

  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO v_conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (v_conv_id, v_arjun_id), (v_conv_id, v_ava_id);
    INSERT INTO messages (conversation_id, sender_id, body) VALUES
      (v_conv_id, v_arjun_id, 'Hi Ava, great work on the midterm — full marks!'),
      (v_conv_id, v_ava_id, 'Thank you so much, Mr. Mehta!');
  END IF;
END $$;

-- Class group chat for Grade 8 - A
INSERT INTO conversations (type, class_id)
SELECT 'class', c.id FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
ON CONFLICT (class_id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id)
SELECT conv.id, u.id
FROM conversations conv
JOIN classes cl ON cl.id = conv.class_id AND cl.name = 'Grade 8' AND cl.section = 'A'
CROSS JOIN (
  SELECT id FROM users WHERE email IN ('arjun.mehta@eduflow.test', 'ava.thompson@eduflow.test', 'liam.chen@eduflow.test', 'sofia.rossi@eduflow.test')
) u
WHERE conv.type = 'class'
ON CONFLICT DO NOTHING;

INSERT INTO messages (conversation_id, sender_id, body)
SELECT conv.id, (SELECT id FROM users WHERE email = 'arjun.mehta@eduflow.test'),
       'Welcome to the Grade 8 - A class chat! Use this to ask questions or share updates.'
FROM conversations conv
JOIN classes cl ON cl.id = conv.class_id AND cl.name = 'Grade 8' AND cl.section = 'A'
WHERE conv.type = 'class'
AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = conv.id);

-- ============================================================
-- Done. Demo accounts (password for all new accounts: Demo@123):
--   headmaster@eduflow.test      (head_master)
--   office@eduflow.test          (office_admin)
--   coordinator@eduflow.test     (group_coordinator)
--   arjun.mehta@eduflow.test     (teacher, Grade 8 - A lead)
--   kavya.iyer@eduflow.test      (teacher, Grade 9 - B lead)
--   rohan.das@eduflow.test       (teacher, Grade 10 - C lead)
--   ava.thompson@eduflow.test    (student, Grade 8 - A)
--   liam.chen@eduflow.test       (student, Grade 8 - A)
--   sofia.rossi@eduflow.test     (student, Grade 8 - A)
--   emma.wilson@eduflow.test     (student, Grade 9 - B)
--   noah.patel@eduflow.test      (student, Grade 9 - B)
--   mia.fernandes@eduflow.test   (student, Grade 9 - B)
--   aditya.rao@eduflow.test      (student, Grade 10 - C)
--   zara.khan@eduflow.test       (student, Grade 10 - C)
--   kabir.singh@eduflow.test     (student, Grade 10 - C)
-- ============================================================
