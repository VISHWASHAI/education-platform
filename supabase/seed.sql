-- Demo data. Run automatically by `supabase db reset`, or manually via psql.

INSERT INTO users (full_name, email, password_hash, role_id)
SELECT 'System Administrator', 'admin@eduflow.test', '$2a$10$Lnb.m6GniCGuVccnN4V1XuYSedFtEFOAYCDUtHa9gxzgKNRElbq4K', id
FROM roles WHERE name = 'super_admin'
ON CONFLICT (email) DO NOTHING;

INSERT INTO classes (name, section) VALUES ('Grade 8', 'A')
ON CONFLICT (name, section) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact)
SELECT 'ADM-1001', 'Ava Thompson', c.id, 'Mark Thompson', '555-0101' FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact)
SELECT 'ADM-1002', 'Liam Chen', c.id, 'Grace Chen', '555-0102' FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
ON CONFLICT (admission_no) DO NOTHING;

INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact)
SELECT 'ADM-1003', 'Sofia Rossi', c.id, 'Marco Rossi', '555-0103' FROM classes c WHERE c.name = 'Grade 8' AND c.section = 'A'
ON CONFLICT (admission_no) DO NOTHING;

-- Login: admin@eduflow.test / Admin@123
