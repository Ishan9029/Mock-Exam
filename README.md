# MockExam Pro

Timed mock tests by **subject** (Math, Bio, Chemistry, Physics, English, General Knowledge, Vedic Maths) with the toughest questions sourced from world-class exam datasets.

## Features

- Choose subject → number of questions (5–50)
- **Hardest questions first** — every test pulls from the hardest available pool (hard → medium only if needed)
- Timer: 1 minute × number of questions
- No question repeats across your last 5 tests (per subject, per account)
- Objective MCQs only, 1 mark each, no negative marking
- Responsive UI for mobile (Android) and desktop (Windows)

## Prerequisites

- [Node.js 20+](https://nodejs.org/) with npm

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed    # Downloads ~25k+ questions from HuggingFace (requires internet)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Question sources

| Exam | Dataset | License |
|------|---------|---------|
| JEE | [datavorous/jee-exam-qna](https://huggingface.co/datasets/datavorous/jee-exam-qna), [JEEBench](https://github.com/dair-iitd/jeebench) | Open / MIT |
| NEET | [openlifescienceai/medmcqa](https://huggingface.co/datasets/openlifescienceai/medmcqa), [catchshubham/neet-dataset](https://huggingface.co/datasets/catchshubham/neet-dataset) | MIT |
| Gaokao | [RUCAIBox/gaokao-bench](https://huggingface.co/datasets/RUCAIBox/gaokao-bench) English subsets | Apache 2.0 |

## Environment

Copy `.env` and set:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-random-secret-here"
AUTH_URL="http://localhost:3000"
```

Generate a secret: `openssl rand -base64 32`

## Deploy to the cloud (share a URL with friends)

**Full step-by-step guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

Quick summary:
1. Push code to **GitHub**
2. Create free **Neon** PostgreSQL database
3. Change `prisma/schema.prisma` provider to `postgresql`
4. Run `npx prisma db push` and `npm run db:seed:force` against Neon
5. Deploy on **Vercel** with env vars `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`

Your site will be live at something like `https://your-app.vercel.app` — no laptop needed.
