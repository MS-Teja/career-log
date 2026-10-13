# Career Log

A placement experience vault for our college. Seniors log their interviews in a structured form (company, role, each round, the questions asked with topic tags, and the result). Juniors filter by company, round, and topic, see which topics come up most often, and turn that into a prep plan.

**Stack:** MongoDB · Express 5 · React 18 (Vite) · Node · TypeScript, with JWT auth and email OTP via Nodemailer.

## Features

- **Juniors**
  - Browse and search experiences, with filters by company, round, topic, year and result.
  - **Question bank:** every question asked, filterable, linking back to the round it came from.
  - Per-company analytics: topic share, round sequences, difficulty, results by year.
  - **Compare** up to three companies side by side.
  - **Prep plan:** pick target companies and get a topic checklist ranked by how often those companies ask each topic, with progress tracking.
  - Upvotes, bookmarks, reports.
- **Seniors**
  - Request senior access, which the placement cell approves.
  - Write experiences in a 4-step form: autosaving drafts, topic suggestions, preview.
  - Choose to post anonymously.
  - Get email when a post is approved or sent back.
- **Admins (placement cell)**
  - Moderation queue with preset notes and undo.
  - Handle reports and senior access requests.
  - Verify and merge companies (aliases), manage roles.
- **Accounts:** college-domain signup with OTP, forgot or reset password, profile and password settings, account deletion. Published posts stay up, anonymised.

## Setup

1. **MongoDB Atlas**: create a free M0 cluster, add a database user, allow your IP under _Network Access_, and copy the connection string.
2. Configure the server:
   ```bash
   cp server/.env.example server/.env
   # set MONGO_URI, JWT_SECRET (openssl rand -hex 32) and ALLOWED_EMAIL_DOMAIN
   ```
   Leave `SMTP_USER`/`SMTP_PASS` empty and emails (OTP codes, notifications) print to the API terminal. To send real email, use a Gmail address and an [App Password](https://myaccount.google.com/apppasswords).
3. Install, seed, and run:
   ```bash
   npm install
   npm run seed -- --reset   # demo companies, experiences and accounts
   npm run dev               # API on :5050, web on :5173
   ```

The API uses port 5050, not 5000, because macOS AirPlay Receiver occupies port 5000.

**Seeded accounts** (domain taken from `ALLOWED_EMAIL_DOMAIN`):

| Account                                                    | Password       | Notes                                       |
| ---------------------------------------------------------- | -------------- | ------------------------------------------- |
| `admin@…`                                                  | `Admin@12345`  | Placement cell admin                        |
| `ananya@…` (also `rahul@`, `sneha@`, `karthik@`, `meera@`) | `Senior@12345` | Verified seniors                            |
| `junior@…`                                                 | `Junior@12345` | Junior                                      |
| `priya@…`                                                  | `Junior@12345` | Junior with a pending senior access request |

## Project layout

```
shared/   topics list, enums, zod schemas and API types used by both sides
server/   Express API: models/, controllers/, routes/, services/ (analytics, questions, prep, otp, mailer, seedData)
          test/ API tests (Vitest + Supertest + in-memory MongoDB)
client/   React app: pages/, components/ (ui/ primitives), api/ (axios + React Query hooks), src/test/
```

## How it works

- **Roles**: everyone signs up as a junior. Seniors request access, and an admin approves it. Admins moderate, manage companies, and change roles. Roles are read from the database on every request, so changes apply immediately.
- **Moderation**: submissions start as `pending`. Admins approve them, or send them back with a note and the author is emailed. Live posts can be reported and unpublished. Approving can be undone.
- **Anonymity**: the author is always stored. The API removes it from responses unless the viewer is the author or an admin.
- **Analytics** (`server/src/services/analytics.ts`): aggregation pipelines unwind rounds, collect the set of topics asked in each technical round, and compute the share of rounds that touched each topic ("DP appeared in 75% of Amazon's technical rounds"). The question bank (`services/questions.ts`) unwinds rounds and questions into one row per question. The prep plan (`services/prep.ts`) averages topic share across the chosen companies.
- **Why MongoDB**: an experience has a variable number of rounds, each with a variable number of questions and tags. That nests naturally in one document, and aggregation runs directly over it.

## Scripts

| Command                                                 |                                                     |
| ------------------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                           | API + web with hot reload                           |
| `npm run seed`                                          | Seed demo data (`-- --reset` wipes first)           |
| `npm test`                                              | Server API tests + client component tests           |
| `npm run typecheck` / `npm run lint` / `npm run format` | Type checks, ESLint, Prettier                       |
| `npm run build` then `NODE_ENV=production npm start`    | Build the client; the API serves it from one origin |

CI (`.github/workflows/ci.yml`) runs type checks, lint, format check, tests, and the build on every push.

## Deploying to Render

Career Log runs as **one Render web service**: Express serves both `/api` and the built React app.

1. Push this repo to GitHub.
2. In **MongoDB Atlas → Network Access**, add `0.0.0.0/0`. Render's free tier has no fixed IP, so Atlas has to allow connections from anywhere. Access is still protected by your database password.
3. In **Render → New → Blueprint**, pick the repo. Render reads `render.yaml` and asks for:
   - `MONGO_URI`: your Atlas connection string, including `/careerlog` or your database name.
   - `ALLOWED_EMAIL_DOMAIN`: your college domain.
   - `CLIENT_URL`: the service URL, such as `https://career-log.onrender.com`. It's used in email links, and you can fill it in after the first deploy.
   - `SMTP_USER` / `SMTP_PASS`: Gmail and its App Password. In production, OTP codes are only delivered by email.
4. After the first deploy, open the Render **Shell** and run `npm run seed` once if you want demo data.

**Free-tier note:** the service sleeps after 15 minutes without traffic, and the next request takes about 50 seconds to wake it. Open the site a minute before a demo.
