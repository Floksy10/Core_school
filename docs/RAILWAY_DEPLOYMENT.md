# Deploying MathBridge Tutoring on Railway

## ⚠️ Important: Persistent database required

**Without a persistent volume, Railway’s disk is ephemeral: every new deploy replaces the container and deletes the SQLite file.** All users, credits, and data would be lost on each update. You **must** add a **Volume** and set **`DB_PATH`** so the database survives redeploys (see [§4 Persistent database (Volume)](#4-persistent-database-volume-required)).

---

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
| `DB_PATH` | **Required for production** | Set to `/data/database.sqlite` after adding a Volume (see §4). Without this, the DB is wiped on every deploy. |

Do **not** commit `.env` to Git. Set everything in Railway’s **Variables** (or use Railway’s “Raw Editor” to paste from `.env` and remove secrets first).

## 4. Persistent database (Volume) — required

Your app uses SQLite. Railway’s default disk is **ephemeral**: each deploy gets a new filesystem and **all data (users, credits, enrollments) is deleted**. To keep data across deploys you must use a **Volume** and point the app at it with **`DB_PATH`**.

### Step-by-step: add a Volume and set DB_PATH

1. In Railway, open your **project** and select the **service** that runs the app (e.g. Core_school).
2. In the service, open the **Variables** tab and note the **Variables** section.
3. Add a **Volume** to this service:
   - In the left sidebar or service view, find **Volumes** (or **Storage** / **Data** depending on Railway’s UI).
   - Click **Add Volume** (or **New Volume**).
   - Set the **mount path** to: **`/data`** (exactly).
   - Create/save the volume.
4. Set the database path:
   - Go to **Variables** for the same service.
   - Add or edit: **`DB_PATH`** = **`/data/database.sqlite`**.
   - Save. Railway will redeploy.
5. After the next deploy, the app will create and use `database.sqlite` on the volume. **That file (and all users/credits/data) will persist across future deploys.**

### If you already deployed without a volume

- Add the Volume and `DB_PATH` as above. The next deploy will start with an **empty** database on the volume (your previous ephemeral data is already gone). Re-create the admin user (sign up or use `ADMIN_EMAIL` + `ADMIN_PASSWORD`). Existing users would need to sign up again unless you restore from a backup.

### Optional: backups

- Railway Volumes are persistent but not automatically backed up. For critical data, consider periodic backups (e.g. copy `database.sqlite` from the volume via a script or use a hosted DB like PostgreSQL later).

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

## 8. Summary

1. Connect the GitHub repo and deploy.
2. Set **Variables** (JWT_SECRET, Stripe keys, ADMIN_EMAIL/ADMIN_PASSWORD, etc.).
3. **Add a Volume** with mount path **`/data`** and set **`DB_PATH=/data/database.sqlite`** so the database is not wiped on every deploy.
4. Generate a domain and configure the Stripe webhook URL and secret.

Your app already uses `process.env.PORT` and `process.env.DB_PATH`; no code changes are needed for persistent storage once the volume and variable are set.
