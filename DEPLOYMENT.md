# Deploying EduFlow — Frontend on Vercel, Backend on Supabase Edge Functions

This replaces the local Express server (`backend/`) with a single Supabase Edge
Function (`supabase/functions/api`) built on [Hono](https://hono.dev), and deploys
the React frontend (`frontend/`) to Vercel. The Express app under `backend/` is
left untouched and still works for local development if you want it — the two are
independent.

## Prerequisites

- A [Supabase](https://supabase.com) account and a new project (or an existing one).
- A [Vercel](https://vercel.com) account.
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally: `npm install -g supabase`
- [Vercel CLI](https://vercel.com/docs/cli) installed locally: `npm install -g vercel`
- Docker Desktop running (the Supabase CLI uses it for local dev / linking).

You do **not** need Deno installed locally — the Supabase CLI bundles everything
needed to serve and deploy Edge Functions.

---

## 1. Database — Supabase Postgres

1. In the Supabase dashboard, create a new project. Note the **project ref**
   (in the URL: `https://supabase.com/dashboard/project/<project-ref>`) and the
   **database password** you set.

2. From the repo root, link the CLI to your project:
   ```bash
   cd "f:\edu flow education"
   supabase login
   supabase link --project-ref <project-ref>
   ```

3. Push the schema (all files in `supabase/migrations/`) to the remote database:
   ```bash
   supabase db push
   ```

4. Seed demo data (optional, but recommended to get a working login immediately):
   ```bash
   # Get your DB connection string from Supabase dashboard → Project Settings → Database
   psql "<connection-string>" -f supabase/seed.sql
   ```
   This creates `admin@eduflow.test` / `Admin@123` and a demo class with 3 students.

---

## 2. Backend — Supabase Edge Function

1. Set the function's environment variables (secrets). These are **not** committed —
   `supabase/functions/api/.env.example` documents what's needed:
   ```bash
   supabase secrets set DATABASE_URL="postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
   supabase secrets set JWT_SECRET="$(openssl rand -hex 32)"
   supabase secrets set JWT_EXPIRES_IN="8h"
   supabase secrets set CLIENT_ORIGIN="https://<your-vercel-app>.vercel.app"
   ```
   (You can update `CLIENT_ORIGIN` again after step 3 once you know the real Vercel URL.)

2. Deploy the function:
   ```bash
   supabase functions deploy api --no-verify-jwt
   ```
   `--no-verify-jwt` is required because we use our own JWT auth (not Supabase Auth) —
   the function verifies tokens itself in `lib/auth.ts`.

3. Your API is now live at:
   ```
   https://<project-ref>.supabase.co/functions/v1/api
   ```
   Test it:
   ```bash
   curl https://<project-ref>.supabase.co/functions/v1/api/health
   # {"status":"ok"}
   ```

---

## 3. Frontend — Vercel

1. Set the API URL as a Vercel environment variable (Project Settings → Environment
   Variables, or via CLI):
   ```bash
   cd frontend
   vercel env add VITE_API_URL production
   # paste: https://<project-ref>.supabase.co/functions/v1/api
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```
   Vercel auto-detects the Vite project. `vercel.json` (already in `frontend/`)
   handles SPA routing so client-side routes like `/students` don't 404 on refresh.

3. Update `CLIENT_ORIGIN` on the Supabase function to match your real Vercel URL
   (needed for CORS):
   ```bash
   supabase secrets set CLIENT_ORIGIN="https://<your-real-vercel-url>.vercel.app"
   supabase functions deploy api --no-verify-jwt
   ```

---

## 4. Verify end-to-end

Visit your Vercel URL and log in with `admin@eduflow.test` / `Admin@123` (or
whatever you seeded). Check the browser Network tab — requests should go to
`https://<project-ref>.supabase.co/functions/v1/api/...` and return real data.

## Local development against the deployed backend (optional)

To run the frontend locally but point it at the deployed Supabase function instead
of a local Express server, create `frontend/.env.local`:
```
VITE_API_URL=https://<project-ref>.supabase.co/functions/v1/api
```
Without this file, `npm run dev` in `frontend/` still uses the local Express
backend via the Vite proxy, unchanged.

## Ongoing changes

Whenever you edit anything under `supabase/functions/api/`, redeploy with:
```bash
supabase functions deploy api --no-verify-jwt
```
Whenever you add a new migration file under `supabase/migrations/`, push it with:
```bash
supabase db push
```
