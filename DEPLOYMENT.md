# Deploy MockExam Pro to the Cloud (Free)

This guide deploys your site so anyone can visit a **public URL** (you and your friends) without running it on your laptop.

**Recommended stack:** [Vercel](https://vercel.com) (hosting) + [Neon](https://neon.tech) (PostgreSQL database)

> **Why not SQLite on Vercel?** Vercel uses serverless functions with no persistent disk. SQLite files are wiped on every deploy. You need a cloud database (PostgreSQL).

> **Why not Streamlit?** This is a Next.js app, not Python/Streamlit. Vercel is built for Next.js.

---

## Overview

```
GitHub repo  →  Vercel (runs the website)  →  Neon (stores users + questions)
                      ↑
              Your friends visit: https://your-app.vercel.app
```

---

## Step 1 — Push code to GitHub

1. Install [Git](https://git-scm.com/) if you don't have it.
2. Open a terminal in your project folder:

```bash
cd "c:\Users\Ishan\Documents\Projects\Online Mock Exam"
git init
git add .
git commit -m "Initial commit - MockExam Pro"
```

3. Create a new repository on [github.com/new](https://github.com/new) (name it e.g. `online-mock-exam`, keep it **Private** if you prefer).
4. Push your code (replace `YOUR_USERNAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/online-mock-exam.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Create a free PostgreSQL database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub login works).
2. Click **New Project** → name it `mockexam` → region closest to you → **Create**.
3. On the dashboard, copy the **Connection string** (starts with `postgresql://...`).
   - Use the **pooled** connection string if offered (better for serverless).
   - Example shape: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

Keep this URL safe — you'll use it in the next steps.

---

## Step 3 — Switch Prisma from SQLite to PostgreSQL

Open `prisma/schema.prisma` and change the datasource block:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

(Change `sqlite` to `postgresql`.)

---

## Step 4 — Seed the cloud database (one-time, from your PC)

You only do this **once** (or when you want to refresh questions). The seed downloads questions from HuggingFace and can take 1–2 minutes.

1. Update your local `.env` file:

```env
DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING_HERE"
AUTH_SECRET="paste-a-long-random-string-here"
AUTH_URL="http://localhost:3000"
```

Generate a secret (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

2. Push schema and seed:

```bash
npm install
npx prisma db push
npm run db:seed:force
```

3. Verify counts printed at the end (you should see thousands of questions per subject).

Your **cloud database** now has all questions and is ready for production.

---

## Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with **GitHub**.
2. Click **Add New… → Project**.
3. Import your `online-mock-exam` repository.
4. **Framework Preset:** Next.js (auto-detected).
5. **Environment Variables** — add these before deploying:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string (same as Step 4) |
| `AUTH_SECRET` | Same random secret you used locally |
| `AUTH_URL` | `https://YOUR-PROJECT-NAME.vercel.app` (you can update after first deploy) |

6. Click **Deploy** and wait ~2 minutes.

7. After deploy, copy your live URL (e.g. `https://online-mock-exam.vercel.app`).

8. Go to **Project → Settings → Environment Variables** and set `AUTH_URL` to your **exact** live URL (with `https://`), then **Redeploy** (Deployments → ⋯ → Redeploy).

> `AUTH_URL` must match your public URL or login sessions may fail.

---

## Step 6 — Test the live site

1. Open your Vercel URL in a browser (phone or laptop).
2. Click **Sign up** and create an account.
3. Pick a subject (e.g. Physics) → start a test.
4. Share the URL with your friend — they sign up on the same site and use it independently.

---

## Updating the site later

When you change code locally:

```bash
git add .
git commit -m "Describe your change"
git push
```

Vercel automatically rebuilds and deploys in ~1–2 minutes.

To refresh questions in the cloud database:

```bash
# .env must still point to Neon DATABASE_URL
npm run db:seed:force
```

---

## Alternative: Render.com

If you prefer Render over Vercel:

1. Create a **PostgreSQL** database on [render.com](https://render.com) (free tier).
2. Create a **Web Service** connected to your GitHub repo.
3. **Build command:** `npm install && npx prisma generate && npm run build`
4. **Start command:** `npm start`
5. Add the same env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (use your `*.onrender.com` URL).
6. Run `npx prisma db push` and `npm run db:seed:force` locally against the Render DB URL once.

Render free tier may spin down after inactivity (slow first load). Vercel is usually snappier for Next.js.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Question bank not seeded" on live site | Run `npm run db:seed:force` with `DATABASE_URL` pointing to Neon |
| Login doesn't work after deploy | Set `AUTH_URL` to exact production URL and redeploy |
| Build fails on Vercel | Check **Deployments → Logs**; ensure `postinstall` runs `prisma generate` |
| Database connection errors | Use Neon **pooled** connection string; ensure `?sslmode=require` is present |
| Friend can't access | Share the `https://` Vercel URL; they need to register their own account |

---

## Cost

- **Vercel** free tier: enough for personal / small group use
- **Neon** free tier: 0.5 GB storage, sufficient for this app
- **Total: $0/month** for typical student usage

---

## Security notes

- Never commit `.env` to GitHub (it's in `.gitignore`).
- Use a strong `AUTH_SECRET` in production.
- Keep the GitHub repo private if you don't want others copying your deployment config.
