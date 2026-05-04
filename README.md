# WorkNest

Team workspace app: tasks, projects, notes, realtime chat, dashboard, Pomodoro, AI (Groq), reports.

## Local development

### Prerequisites

- Node.js 20+
- MongoDB URI (Atlas or local)

### Backend (`server`)

```bash
cd server
cp .env.example .env   # edit MONGODB_URI, JWT_SECRET, GROQ_API_KEY, CLIENT_URL
npm install
npm run dev
```

### Frontend (`client`)

```bash
cd client
# optional: cp .env.example .env — leave empty for proxy to localhost
npm install
npm run dev
```

Open `http://localhost:5173`. API proxies to `:5000` per `vite.config.js`.

Optional seed users/data: `cd server && npm run seed`.

## Deploy (public URL for anyone)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for GitHub + MongoDB Atlas + Render (API) + Vercel (frontend).

## Documentation

- [Major project report](docs/WORKNEST_PROJECT_REPORT.md)
- [Diagrams](docs/DIAGRAMS_FOR_PRESENTATION.md)

## License

Use for coursework / demos as appropriate.
