# WorkNest — Terminal steps (copy-paste)

Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` everywhere.  
Run commands from your machine in WSL/Linux (paths use `~/worknest` — change if yours differs).

---

## A. One-time: tools

```bash
node -v    # want v18+ or 20+
git --version
```

Install if missing: Node from [nodejs.org](https://nodejs.org), Git with your OS package manager.

Optional (GitHub from terminal): [GitHub CLI](https://cli.github.com/) → then `gh auth login`.

---

## B. Local project + env (before GitHub)

```bash
cd ~/worknest

# Backend secrets (edit the file!)
cp server/.env.example server/.env
nano server/.env
# Fill: MONGODB_URI, JWT_SECRET, GROQ_API_KEY, CLIENT_URL=http://localhost:5173

# Frontend — local dev leave empty file or skip
touch client/.env
# Leave empty OR add VITE_API_URL only for production builds

cd server && npm install && cd ..
cd client && npm install && cd ..
```

Test locally (two terminals):

```bash
# Terminal 1
cd ~/worknest/server && npm run dev

# Terminal 2
cd ~/worknest/client && npm run dev
```

Browser: http://localhost:5173  

Stop both with **Ctrl+C** when done.

---

## C. Push to GitHub (terminal only)

Create an **empty** repo on GitHub (website): name it e.g. `worknest`. **Do not** add README/license if Git asks (avoids merge junk).

Then:

```bash
cd ~/worknest

git status

# If not a git repo yet:
git init
git branch -M main

git add .
git reset server/.env        # NEVER commit secrets
git reset client/.env        # ignore if missing or empty; safe to reset anyway
git add server/.env.example client/.env.example

git commit -m "WorkNest initial commit"

git remote remove origin 2>/dev/null
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

git push -u origin main
```

If GitHub asks login: use **Personal Access Token** as password, or SSH remote instead:

```bash
git remote set-url origin git@github.com:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## D. Deploy — what the terminal cannot do alone

These need a **browser** once (free accounts):

| Step | Where | Why terminal isn’t enough |
|------|--------|---------------------------|
| MongoDB Atlas cluster + URI | atlas.mongodb.com | Create DB + whitelist IP |
| Render Web Service | render.com | Connect repo, set env vars in UI |
| Vercel project | vercel.com | Connect repo + `VITE_API_URL` in UI |

After that, redeploys are automatic on `git push` if you linked the repo.

**Exact env values** → see **`DEPLOYMENT.md`** in project root.

---

## E. Deploy frontend with Vercel CLI (terminal, after browser login once)

```bash
npm install -g vercel
vercel login
cd ~/worknest/client

# First deploy — follow prompts (link GitHub repo or deploy this folder)
vercel

# Production URL + env (use your REAL Render API URL, no trailing slash, no /api)
vercel env add VITE_API_URL production
# paste: https://your-api.onrender.com

vercel --prod
```

Copy the **`https://....vercel.app`** URL → set **`CLIENT_URL`** on Render to that URL, redeploy API.

---

## F. Quick checklist order

1. Terminal: **B** (install + `.env`)  
2. Browser: Atlas → **`MONGODB_URI`**  
3. Terminal: **C** (push GitHub)  
4. Browser: Render → service **`server`**, paste env including **`CLIENT_URL`** (temporary `http://localhost:5173` then update after Vercel)  
5. Terminal + browser: **E** (Vercel) → set **`VITE_API_URL`** → **`vercel --prod`**  
6. Browser: Render → set **`CLIENT_URL`** = your Vercel URL → **Manual Deploy**

**Link you give to anyone:** your **Vercel** `https://....vercel.app` URL only.
