import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

async function seed() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const { rows: roleRows } = await query(`SELECT id FROM roles WHERE name = 'super_admin'`);
  const roleId = roleRows[0].id;

  await query(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     VALUES ('System Administrator', 'admin@eduflow.test', $1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [passwordHash, roleId]
  );

  const { rows: classRows } = await query(
    `INSERT INTO classes (name, section) VALUES ('Grade 8', 'A')
     ON CONFLICT (name, section) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const classId = classRows[0].id;

  await query(
    `INSERT INTO students (admission_no, full_name, class_id, guardian_name, guardian_contact)
     VALUES
       ('ADM-1001', 'Ava Thompson', $1, 'Mark Thompson', '555-0101'),
       ('ADM-1002', 'Liam Chen', $1, 'Grace Chen', '555-0102'),
       ('ADM-1003', 'Sofia Rossi', $1, 'Marco Rossi', '555-0103')
     ON CONFLICT (admission_no) DO NOTHING`,
    [classId]
  );

  console.log('Seed complete. Login with admin@eduflow.test / Admin@123');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
