# EEST — Operations Center

E-Tech Systems Jamaica's project management app: sales pipeline, project tracking, the
quoting Workbook (Cost & Margin, BOM, Synthesis, exports), installation and commissioning,
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
| `CAMS_API_URL`, `CAMS_USERNAME`, `CAMS_PASSWORD` | no | CAMS origin and a dedicated CAMS admin account for Send to CAMS; the button is hidden when unset |
| `CAMS_INTEGRATION_KEY` | no | Shared secret for the CAMS mobile app API (see CAMS integration); off when unset |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | no | Server error monitoring; off when unset |
| `NODE_ENV` | no | `production` enables SSL for the database connection |

Frontend (build time):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL in production (e.g. `https://<api-host>/api`); defaults to `/api` |
| `VITE_PROXY_TARGET` | Dev-server proxy target (default `http://localhost:3001`) |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` | Frontend error monitoring; off when unset |

## CAMS integration

EEST and CAMS (E-Tech's asset management app, repo `joshuahutchinson-opula/E-Tech-CCSM`) talk
server to server. Browsers and phones never call the other app directly.

**EEST → CAMS (Send to CAMS).** The Installation page's Send to CAMS button pushes a project's
completed install devices into CAMS. EEST signs in to CAMS with `POST /api/auth/login` using
`CAMS_USERNAME`/`CAMS_PASSWORD` (a CAMS admin account), then calls `GET /api/clients`,
`GET /api/zones?client_id=`, `GET /api/zones/discover?client_id=`, `POST /api/zones` and
`POST /api/import/{cameras|doors|servers|switches|software}` with `Authorization: Bearer <token>`.
Each device is sent once (`install_devices.cams_sent_at`) unless "Resend all" is ticked.

**CAMS → EEST (CAMS mobile app).** The CAMS server calls the endpoints below on behalf of a tech
using the CAMS mobile app's Installation tab.

### Headers (every request)

| Header | Value |
|---|---|
| `X-Integration-Key` | Equal to EEST's `CAMS_INTEGRATION_KEY`. Missing or wrong → `401`. |
| `X-User-Email` | The tech's email, e.g. `shanice@e-techsystemsja.com`. Must be an EEST team member (`TEAM_EMAILS`, default firstname@e-techsystemsja.com); otherwise → `403`. |

If `CAMS_INTEGRATION_KEY` isn't set on EEST, every request gets `503`. The tech always gets the
Tech role's view: no prices and Projects-pipeline projects only. Every change is written to the
project's audit trail as `"<Name> (via CAMS mobile)"` and shows on EEST's Installation page within
15 seconds.

Errors are JSON: `{ "error": "message" }`.

### `GET /api/integrations/cams/jobs`

The tech's installation work: Projects-pipeline projects in the Installation or Commissioning
stage where the tech is the project's assignee or a collaborator, or is assigned to one of its
devices. Grouped project → zone → device. Every device in those projects is included, with
`assignee` so the app can show "mine".

```
200
{
  "tech": { "name": "Shanice", "email": "shanice@e-techsystemsja.com" },
  "projects": [
    {
      "id": "78009f75-d8b3-4b3c-8926-f2216a8c7e5f",
      "name": "Liguanea Plaza CCTV",
      "client": "Test Client Ltd",
      "location": "",
      "stage": "installation",
      "dueDate": null,
      "zones": [
        {
          "id": "10028ebd-0038-4c6d-88b9-fcc7d62bc46a",
          "name": "Lobby",
          "devices": [
            {
              "id": "9ede82b8-d609-46dd-ba39-17c4417e1229",
              "name": "Lobby Cam 1",
              "type": "camera",
              "location": "Lobby",
              "status": "complete",
              "assignee": "Marvin",
              "notes": "Above reception",
              "completedAt": "2026-10-23T23:05:11.201Z",
              "photos": ["/api/files/documents/1792815195719-418243655.jpg?exp=1792819200&sig=LmBL…"],
              "asBuilt": {
                "serialNumber": "ACC123",
                "macAddress": "AA:BB:CC:DD:EE:01",
                "ipAddress": "10.0.0.11",
                "firmware": "11.8",
                "warrantyExpiry": "2029-06-30"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

- `type`: `camera`, `access`, `door`, `nvr`, `server`, `panel`, `power`, `intercom` or `software`.
- `status`: `pending`, `in-progress`, `complete` or `failed`.
- `completedAt`: when the device was last marked complete (null if not complete or not recorded).
- `photos`: signed links relative to EEST's origin (e.g. `https://<eest-api-host>` + the path).
  They work without headers and expire after about an hour; fetch `jobs` again for fresh ones.

### `PATCH /api/integrations/cams/devices/:id`

Update a device in one of the tech's jobs. Send only what changes; inside `asBuilt`, only the
fields sent change and an empty string clears one.

```
PATCH /api/integrations/cams/devices/9ede82b8-d609-46dd-ba39-17c4417e1229
Content-Type: application/json

{
  "status": "complete",
  "notes": "Re-aimed toward the entrance",
  "asBuilt": { "serialNumber": "ACC123", "macAddress": "AA:BB:CC:DD:EE:01", "ipAddress": "10.0.0.11", "firmware": "11.9.1", "warrantyExpiry": "2029-06-30" }
}
```

Response `200`: the updated device, in the same shape as in `jobs`.

- `400`: invalid `status`, `notes` over 2000 characters, MAC not like `AA:BB:CC:DD:EE:FF`,
  invalid IP, or `warrantyExpiry` not `YYYY-MM-DD`.
- `404`: the device doesn't exist or isn't in one of this tech's jobs.

### `POST /api/integrations/cams/devices/:id/photos`

Add an as-installed photo. `multipart/form-data` with one image in the field `file` (up to 50 MB).
Stored the same way as photos added on EEST's Installation page (a project document, linked on the
device).

```
curl -X POST https://<eest-api-host>/api/integrations/cams/devices/9ede82b8-…/photos \
  -H "X-Integration-Key: $CAMS_INTEGRATION_KEY" \
  -H "X-User-Email: shanice@e-techsystemsja.com" \
  -F "file=@lobby-cam-1.jpg;type=image/jpeg"
```

Response `201`: the updated device with the new link in `photos`. `400` if there's no file or it
isn't an image; `404` as for `PATCH`.
