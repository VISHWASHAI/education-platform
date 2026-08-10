import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA_FILES = ['schema.sql', 'schema_exams.sql', 'schema_assignments.sql', 'schema_fees.sql', 'schema_messaging.sql', 'schema_gallery.sql'];

async function migrate() {
  for (const file of SCHEMA_FILES) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }
  console.log('Schema applied successfully.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
