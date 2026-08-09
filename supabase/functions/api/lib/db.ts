import pg from 'npm:pg@8.12.0';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: Deno.env.get('DATABASE_URL'),
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);
