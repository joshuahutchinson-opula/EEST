# EEST — Operations Center

E-Tech Systems Jamaica's project management app: sales pipeline, project tracking, the
quoting Workbook (Cost & Margin, BOM, Synthesis, proposals), installation and commissioning,
device library and inventory, plus read-only share links for clients and subcontractors.

- **Frontend** (`/`): React 19 + Vite + Tailwind. Pages live in `src/pages/<page>/`, shared UI in
  `src/components/`, the API client in `src/api/`.
- **Server** (`/server`): Express + TypeScript + Postgres. The schema is created and migrated by
  `initDB()` in `server/src/db.ts` on every boot.
- Workbook totals have one definition, `server/src/lib/workbookTotals.ts`, which the frontend
  imports directly.

Both deploy to Railway as separate services.

## Running locally

You need Node 20+ and a local Postgres. Never point local dev at the production database.

```bash
# 1. Server (port 3001)
cd server
npm install
cp .env.example .env        # then fill in DATABASE_URL and SESSION_JWT_SECRET at minimum
createdb eest               # any empty database; tables are created on first boot
npm run dev

# 2. Frontend (port 5173), in another terminal
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:3001`. Set `VITE_PROXY_TARGET` to point
it somewhere else.

To sign in locally without Microsoft, set `DEMO_USERNAME` and `DEMO_PASSWORD_HASH` and use
"Demo login" on the sign-in page. Microsoft sign-in needs an Entra app registration with
`http://localhost:3001/api/auth/microsoft/callback` as a redirect URI.

`npm run build` builds each package (run it in both the root and `server/`).

## Environment variables

Server (`server/.env`; see `server/.env.example` for details):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_JWT_SECRET` | yes | Signs session tokens and file download links |
| `PORT` | no | API port (default 3001; Railway sets it) |
| `APP_BASE_URL` | yes for SSO | Frontend origin the OAuth callback redirects to |
| `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REDIRECT_URI` | yes for SSO | Microsoft Entra sign-in |
| `ALLOWED_EMAIL_DOMAIN` | no | Only this domain may sign in (default `e-techsystemsja.com`) |
| `TECH_EMAILS` | no | Comma-separated emails that get the restricted Tech role |
| `UPLOAD_DIR` | in production | Where uploads are stored; point at a persistent volume |
| `DEMO_USERNAME`, `DEMO_PASSWORD_HASH` | no | Optional demo account (bcrypt hash) |
| `TEAM_EMAILS` | no | `Name=email` list for the Calendar tab and task events (defaults to firstname@domain) |
| `MAIL_SENDER` | no | Mailbox email alerts are sent from (task assigned, client approval, overdue tasks); off when unset |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | no | Server error monitoring; off when unset |
| `NODE_ENV` | no | `production` enables SSL for the database connection |

Frontend (build time):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL in production (e.g. `https://<api-host>/api`); defaults to `/api` |
| `VITE_PROXY_TARGET` | Dev-server proxy target (default `http://localhost:3001`) |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` | Frontend error monitoring; off when unset |
