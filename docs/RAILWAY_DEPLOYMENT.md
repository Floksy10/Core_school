# Deploying MathBridge Tutoring on Railway

## 1. Prerequisites

- [Railway](https://railway.app) account (sign up with GitHub)
- Your code in a **GitHub** repo (Railway deploys from Git)

## 2. Create a new project on Railway

1. Go to [railway.app](https://railway.app) and log in.
2. Click **New Project**.
3. Choose **Deploy from GitHub repo** and connect your GitHub account if needed.
4. Select the repo that contains this project (e.g. `Tutoring_demo` or your repo name).
5. Railway will detect it as a **Node.js** app and use `npm install` and `npm start` automatically.

## 3. Configure environment variables

In your Railway project:

1. Open your **service** (the deployed app).
2. Go to the **Variables** tab.
3. Add these variables (same names as in your `.env`):

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | No | Railway sets this automatically. Your app already uses `process.env.PORT`. |
| `JWT_SECRET` | **Yes** | Use a long random string (e.g. from `openssl rand -base64 32`). |
| `ADMIN_EMAIL` | Optional | Email of the admin user. Defaults to `ilya.kudrenko@gmail.com` if unset. |
| `ADMIN_PASSWORD` | Optional | Admin login password. If set with `ADMIN_EMAIL`, the app creates or updates that user on startup so you can log in as admin. |
| `STRIPE_SECRET_KEY` | **Yes** (for payments) | Your Stripe secret key (e.g. `sk_live_...` or `sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | **Yes** (for payments) | From Stripe Dashboard → Webhooks → endpoint for your **production** URL. |
| `GMAIL_USER` | Optional | For email notifications. |
| `GMAIL_APP_PASSWORD` | Optional | App password for the Gmail account. |
| `CALENDLY_API_TOKEN` | Optional | If you use Calendly integration. |
| `DB_PATH` | Optional | Defaults to `./database.sqlite`. See “Database” below. |

Do **not** commit `.env` to Git. Set everything in Railway’s **Variables** (or use Railway’s “Raw Editor” to paste from `.env` and remove secrets first).

## 4. Database (SQLite on Railway)

Your app uses SQLite with a file at `DB_PATH` (default `./database.sqlite`).

- **Ephemeral disk**: By default, Railway’s filesystem is **ephemeral**. The SQLite file is recreated on each new deploy, so data is lost between deploys.
- **Persistent data**: For production you can:
  - **Option A – Railway Volume**: In Railway, add a **Volume** to the service, mount it (e.g. `/data`), and set `DB_PATH=/data/database.sqlite` so the database survives redeploys.
  - **Option B**: Migrate to a hosted database (e.g. PostgreSQL) later if you need scaling and backups.

## 5. Stripe webhook (production)

After your app is live on Railway you’ll get a URL like:

`https://your-app-name.up.railway.app`

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**: `https://your-app-name.up.railway.app/api/stripe/webhook`
3. Select the events you use (e.g. `checkout.session.completed`, `payment_intent.succeeded` – match what your code expects).
4. Copy the **Signing secret** (`whsec_...`).
5. In Railway **Variables**, set `STRIPE_WEBHOOK_SECRET` to that value (and redeploy if needed).

## 6. Deploy and open the app

1. After connecting the repo and setting variables, Railway will build and deploy.
2. To get a public URL: open your service → **Settings** → **Networking** → **Generate Domain** (or use a custom domain).
3. Open the generated URL (e.g. `https://your-app-name.up.railway.app`) to use the app.

## 7. Optional: `railway.json`

Railway usually detects Node and runs `npm start`. If you want to be explicit, you can add a `railway.json` in the project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Your `package.json` already has `"start": "node server.js"` and the server uses `process.env.PORT`, so this file is optional.

## 8. Using a persistent SQLite volume (step-by-step)

1. In Railway, open your service.
2. Go to **Variables** or the **Volumes** tab (depending on UI).
3. Add a **Volume** and set the mount path to e.g. `/data`.
4. Add variable: `DB_PATH=/data/database.sqlite`.
5. Redeploy. The SQLite file will now persist across deploys.

---

**Summary:** Connect the GitHub repo → set env vars (especially `JWT_SECRET`, Stripe keys, and optionally `DB_PATH` with a volume) → generate a domain → update Stripe webhook URL and secret. Your app is already configured to use `PORT` and `npm start`, so it should run on Railway without code changes.
