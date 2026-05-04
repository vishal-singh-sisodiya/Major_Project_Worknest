# Deploy WorkNest (GitHub → public URL)

Your app has **three parts**:

1. **MongoDB database** — use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier).
2. **Backend** — Node + Express + Socket.IO (`/server`).
3. **Frontend** — React + Vite static build (`/client`).

Visitors open **only the frontend link**. The frontend calls your backend API and Socket.IO host.

---

## Step 1: Push code to GitHub

1. Create a new repo on GitHub (empty, no README if you prefer).
2. From your machine (replace `YOUR_USER` / `YOUR_REPO`):

```bash
cd /path/to/worknest
git init   # skip if already a repo
git add .
git status   # confirm .env is NOT tracked (should be ignored)
git commit -m "Prepare WorkNest for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

**Never commit** `.env` files containing real secrets. Use `.env.example` as templates only.

---

## Step 2: MongoDB Atlas

1. Create a **free cluster**.
2. **Database Access**: create DB user + password.
3. **Network Access**: add **`0.0.0.0/0`** (allow from anywhere — needed for Render/Vercel IP ranges). For stricter setups, configure provider-specific IPs later.
4. **Connect** → Drivers → copy the **MongoDB URI** and replace `<password>` with your user password. Add a database name, e.g. `...mongodb.net/worknest?...`.

You will paste this URI into the backend host as **`MONGODB_URI`**.

---

## Step 3: Deploy backend (Render — simple free option)

[Render](https://render.com) can run Node and gives you a permanent URL like `https://worknest-api.onrender.com`.

1. Sign up → **New** → **Web Service**.
2. Connect your **GitHub** repo.
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance type**: Free (cold starts ~1 min after idle)

4. **Environment variables** (Render → Environment):

| Key | Example / note |
|-----|----------------|
| `MONGODB_URI` | Full Atlas URI with password |
| `JWT_SECRET` | Long random string (32+ chars) |
| `GROQ_API_KEY` | From [Groq Console](https://console.groq.com) (needed for AI) |
| `CLIENT_URL` | Your **frontend** URL after Step 4, e.g. `https://worknest-xxxx.vercel.app` |
| `PORT` | Render sets **`PORT`** automatically — your code uses `process.env.PORT \|\| 5000`; **do not override** unless you know what you're doing |

5. Deploy. Copy your service URL → this is **`API_ORIGIN`** (e.g. `https://worknest-api.onrender.com`).

Health check: `https://YOUR-API/api/health` should return `{"ok":true}`.

Optional: connect `render.yaml` from this repo as a **Blueprint** (API only).

---

## Step 4: Deploy frontend (Vercel — simple free option)

[Vercel](https://vercel.com) builds the Vite app and hosts it at something like `https://worknest-xxx.vercel.app`.

1. Sign up → **Add New Project** → import the **same GitHub repo**.
2. **Framework Preset**: Vite (auto-detected).
3. **Root Directory**: **`client`**.
4. **Build Command**: `npm run build`.
5. **Output Directory**: `dist`.

6. **Environment Variables** (must be set **before** build — Vite bakes these in):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | Exactly your API origin — e.g. `https://worknest-api.onrender.com` **without** `/api` and **without** trailing slash |

7. Deploy. Open the Vercel URL — **this is the link you share**.

8. Go **back** to Render and set **`CLIENT_URL`** to that Vercel URL (comma-separated URLs allowed for preview deploys):

```text
https://your-prod.vercel.app,https://your-preview.vercel.app
```

Redeploy the API once `CLIENT_URL` is correct so **CORS** and **Socket.IO** accept your site.

---

## Step 5: Verify

1. Open the **Vercel** link in a browser.
2. Register a new account; create a workspace.
3. Create a task, open chat — if Socket fails, double-check **`VITE_API_URL`** matches Render URL and **`CLIENT_URL`** on the server lists your Vercel domain.

---

## Same-origin alternative (advanced)

Serving the **`client/dist`** static files **from Express** avoids CORS splitting (single URL). For coursework, split deploy is clearer and mirrors real products.

---

## Free tier caveats

- **Render Free** sleeps after inactivity → first load can take ~60 seconds.
- **Atlas** caps storage and connections — fine for demos.
- **Groq** has rate limits; ensure `GROQ_API_KEY` is set or AI endpoints will error.

---

## Checklist summary

| Item | Where |
|------|--------|
| Code on GitHub | Your repo URL |
| `MONGODB_URI` | Render env |
| `JWT_SECRET` | Render env |
| `GROQ_API_KEY` | Render env |
| `CLIENT_URL` | Render env = Vercel site URL |
| `VITE_API_URL` | Vercel env = Render API URL |
| **Share this link with anyone** | **Vercel production URL only** |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS errors in browser console | Match `CLIENT_URL` on Render to exact Vercel URL (scheme + hostname). |
| API 401 / network | Wrong `VITE_API_URL`; rebuild Vercel after changing env vars. |
| Chat / Kanban no realtime | Socket connects to `VITE_API_URL`; confirm same + `CLIENT_URL` includes frontend. |
| AI errors | Missing or invalid `GROQ_API_KEY` on backend. |

For more project context see `docs/WORKNEST_PROJECT_REPORT.md`.
