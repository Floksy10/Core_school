# Deploy Core School to Production

This guide walks you through hosting the project so it runs on a public URL (not localhost).

---

## 1. Choose a hosting platform

**Recommended: [Railway](https://railway.app)** — easy setup, supports Node.js, SQLite with persistent storage, and env vars. Free tier available.

**Alternative: [Render](https://render.com)** — free tier; note: free instances use ephemeral disk, so SQLite data can be lost on restart. Use a persistent disk (paid) or add a PostgreSQL database for production.

**Alternative: [Fly.io](https://fly.io)** — supports SQLite with persistent volumes.

Below we use **Railway** as the example.

---

## 2. Prepare your repo for deployment

- Commit and push your code to GitHub (see previous steps).
- Ensure `.env` is **never** committed (it’s in `.gitignore`). You’ll set env vars in the host’s dashboard.

---

## 3. Deploy on Railway

### 3.1 Create project

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repo and (if asked) the branch (e.g. `main`).
4. Railway will detect Node.js and use `npm start` (your `package.json` already has `"start": "node server.js"`).

### 3.2 Add persistent storage for SQLite (important)

By default the filesystem is ephemeral. To keep your database:

1. In your Railway project, click your service.
2. Go to **Variables** or **Settings** and add a **Volume**:
   - Mount path: `/data`
3. In **Variables**, add:
   ```bash
   DB_PATH=/data/database.sqlite
   ```
4. We need the app to use `DB_PATH` when set. See step 3.4 below.

### 3.3 Set environment variables

In Railway: **Your service → Variables** (or **Settings → Environment**). Add:

| Variable | Value | Notes |
|----------|--------|--------|
| `JWT_SECRET` | (long random string) | Generate one: `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | From Stripe Dashboard → API keys (use **live** for real payments) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe **production** webhook (see step 4) |
| `CALENDLY_API_TOKEN` | (your token) | Same as in `.env` locally |
| `GMAIL_USER` | your@gmail.com | Optional, for tutor emails |
| `GMAIL_APP_PASSWORD` | app password | Optional; create in Google Account → Security → App passwords |
| `DB_PATH` | `/data/database.sqlite` | Only if you added a volume at `/data` |

Do **not** commit these values; they stay in Railway only.

### 3.4 Use DB_PATH in server (optional but recommended)

So the app uses the persistent path when deployed, we can set the database path from env. Add at the top of `server.js` after `require('dotenv').config();`:

```javascript
const DB_PATH = process.env.DB_PATH || './database.sqlite';
```

Then where the database is opened, use `DB_PATH` instead of `'./database.sqlite'`. (If you prefer to keep a single path, you can skip the volume and accept that free-tier disk may be ephemeral until you add a volume.)

---

## 4. Stripe production webhook

For payments to work in production, Stripe must send events to your **live URL**.

1. Get your app’s public URL from Railway (e.g. `https://your-app.up.railway.app`).
2. In [Stripe Dashboard](https://dashboard.stripe.com) go to **Developers → Webhooks**.
3. Click **Add endpoint**.
4. **Endpoint URL:** `https://YOUR-RAILWAY-URL/api/stripe/webhook`  
   (e.g. `https://your-app.up.railway.app/api/stripe/webhook`)
5. **Events to send:** select `checkout.session.completed`.
6. Click **Add endpoint**.
7. Open the new endpoint and **Reveal** the **Signing secret** (`whsec_...`).
8. Copy it and in Railway **Variables** set:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
9. Redeploy the app so it picks up the new variable.

Now when someone pays on the live site, Stripe will call this URL and your server will add credits.

---

## 5. Frontend: use the same origin (no CORS issues)

Your frontend is served by the same Node app (`express.static('.')`), so as long as users open the site via your Railway URL (e.g. `https://your-app.up.railway.app`), all API calls go to the same origin. No extra CORS or API URL config is needed.

If you later move the frontend to another domain, you’d set CORS and/or an API base URL in the frontend.

---

## 6. Custom domain (optional)

In Railway: **Your service → Settings → Domains** → **Custom Domain**. Add your domain and follow the DNS instructions (CNAME or A record). Then in Stripe, update the webhook URL to use your custom domain if you use it for the app.

---

## 7. Checklist before going live

- [ ] Code pushed to GitHub; deployment runs from that repo.
- [ ] All env vars set in Railway (no secrets in code).
- [ ] `JWT_SECRET` is a strong random value.
- [ ] Stripe: production webhook added with your **live** URL; `STRIPE_WEBHOOK_SECRET` in Railway matches that endpoint.
- [ ] For real payments: use **live** Stripe keys (`sk_live_...`, `pk_live_...`) in Railway; for testing only, you can keep test keys and the test webhook URL.
- [ ] If you use a volume: `DB_PATH` set to the path where the volume is mounted (e.g. `/data/database.sqlite`).
- [ ] Open the app URL and test: sign up, login, credits page, one test purchase (test card if still on test mode).

---

## 8. Other platforms (short)

- **Render:** New Web Service → connect repo → Build: `npm install` → Start: `npm start`. Add env vars in Dashboard. For SQLite, add a persistent disk or use PostgreSQL.
- **Fly.io:** Use `fly launch` and `fly deploy`; add a volume for SQLite and set `DB_PATH` to the mounted path; set secrets with `fly secrets set KEY=value`.

Once deployed, your app runs on a public URL; Stripe and the rest of the stack work the same as in development, with env vars and the production webhook configured on the host.
