# Deploying TourOps to Render

TourOps is two separate services — the Express API and the Next.js web app — plus a MongoDB database that lives outside Render (Atlas). Render does not host MongoDB itself.

## 1. Prerequisites

- A MongoDB Atlas cluster (or any reachable MongoDB) with its connection string. **Never reuse a connection string that has ever been committed to git** — if in doubt, rotate the database password first.
- A Cloudinary account (for document/photo uploads).
- An SMTP account for outgoing email (a Gmail app password works for testing).
- (Optional) An OpenAI API key for the AI features.

## 2. Option A — One-click Blueprint

This repo includes a [render.yaml](render.yaml) that defines both services. In the Render dashboard, choose **New → Blueprint**, point it at this repo, and Render will create `tourops-api` and `tourops-web`. You will still need to fill in the env vars marked `sync: false` below before the first deploy succeeds.

If the blueprint fails to parse for any reason, just create the two services manually with Option B below — the settings are the same either way.

## 3. Option B — Manual setup

### API service (`tourops-api`)

- **Type:** Web Service, Node
- **Root Directory:** `.` (repo root — this is a monorepo with npm workspaces)
- **Build Command:** `npm install && npm run build --workspace=apps/api`
- **Start Command:** `npm run render-start --workspace=apps/api`

The start command runs, in order: the base account seeder (creates a demo agency + staff logins only if none exist), the demo-data seeder (populates ~45 days of realistic sample data across every module, but **only if the agency has no data yet** — it's safe to leave in permanently and will no-op on every later restart/redeploy), then finally boots the actual server. None of this touches real data once any exists.

Environment variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_ACCESS_SECRET` | any long random string (Render can auto-generate this) |
| `JWT_REFRESH_SECRET` | any long random string (Render can auto-generate this) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | your web service's URL, e.g. `https://tourops-web.onrender.com` (fill in **after** the web service exists) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from your Cloudinary dashboard |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | from your email provider |
| `OPENAI_API_KEY` | optional, enables AI features |

### Web service (`tourops-web`)

- **Type:** Web Service, Node
- **Root Directory:** `.`
- **Build Command:** `npm install && npm run build --workspace=apps/web`
- **Start Command:** `npm run start --workspace=apps/web`

Environment variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | your API service's URL, e.g. `https://tourops-api.onrender.com` (fill in **after** the API service exists) |

## 4. First deploy order

1. Deploy `tourops-api` first with a placeholder `CLIENT_URL` (you can fix it after step 3).
2. Deploy `tourops-web` with `NEXT_PUBLIC_API_URL` set to the API service's real Render URL.
3. Go back to `tourops-api` and set `CLIENT_URL` to the web service's real Render URL, then trigger a manual redeploy so CORS allows requests from it.

## 5. What you get on first boot

The API's start sequence automatically creates a demo agency ("TourOps Demo Agency") with one login per role, all using the password `Password@123`:

- `owner@tourops.com` — Agency Owner
- `consultant@tourops.com` — Travel Consultant
- `visa@tourops.com` — Visa Officer
- `finance@tourops.com` — Finance Officer
- `support@tourops.com` — Customer Support
- `customer@tourops.com` — Customer Portal

**Change these passwords (or delete/deactivate these accounts) before giving anyone else access to the deployment.** It then populates that agency with ~45 customers, travel files, bookings, visa applications, invoices, receipts, documents, notifications and activity history spanning the last 45 days, so every feature has realistic data to show immediately.

If you'd rather start from a clean slate and register your own real agency instead, register a real account through the web app's `/register` page *before* the demo seed has a chance to run once — since the demo-data seeder targets whichever agency was created first, and skips seeding entirely once any agency already has data.

## 6. Free-tier note

Render's free web services spin down after inactivity and take 30–60 seconds to wake on the next request. For a live customer-facing deployment, use a paid instance type so the app doesn't sleep.
