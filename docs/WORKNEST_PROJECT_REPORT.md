# WorkNest — Complete Major Project Documentation

**Course / evaluation use:** Final-year project report, presentation, and viva preparation  
**Repository:** WorkNest (`worknest`)  
**Document version:** 1.0  

---

## 1. PROJECT OVERVIEW

### 1.1 Project title
**WorkNest** — Collaborative workspace platform for teams to manage tasks, projects, notes, chat, productivity timers, and AI-assisted planning in one place.

### 1.2 Problem statement
Students, startups, and small teams often juggle multiple tools for task boards, messaging, calendars, and documentation. Switching contexts increases friction, context is fragmented, and real-time teamwork is harder when apps are disconnected. Teams also need permission-aware visibility so not everyone sees every task detail.

### 1.3 Objective of the project
- Provide a **single web application** for workspace-centric collaboration (tasks under projects inside workspaces).
- Support **authentication**, **roles** (workspace and project levels), **real-time updates** via WebSockets for tasks and chat.
- Integrate an **AI assistant** (Groq-hosted LLM) that can summarize, suggest tasks, plan the day, and answer questions using workspace task context—with **privacy-conscious filtering** of what each user may see.
- Deliver a modern, responsive UI with dashboards, Kanban/list views, Pomodoro focus sessions, reporting charts, and theming.

### 1.4 Real-world use case
A software project group creates a workspace, invites members via an invite code, creates projects (for example “Mobile app”, “Backend API”), assigns tasks with priorities and due dates, discusses work in Slack-style channels and direct messages, tracks progress on dashboards and reports, and uses AI to summarize notes or reorder work for the day—without leaving one product.

### 1.5 Target users
- **University project teams** and **clubs**
- **Small software teams** and **startup squads**
- **Freelancers** collaborating with clients in a gated workspace

---

## 2. ABSTRACT (150–200 words)

WorkNest is a full-stack teamwork and productivity platform. It addresses fragmented tooling by combining task management under projects inside shared workspaces with real-time chat, workspace-scoped notes, calendar-style views tied to deadlines, configurable Pomodoro sessions, analytics charts, and an AI companion. The frontend is built with React and communicates with a Node.js REST API backed by MongoDB. Security is enforced with JWT authentication, bcrypt password hashing, workspace membership checks, and project-level visibility rules—so managers, members, and viewers see tasks according to assignment and role. Socket.IO broadcasts task moves and edits and delivers live chat notifications. The assistant uses Groq’s API (Llama-family model) through dedicated endpoints so users can summarize text, generate task suggestions, prioritize work, obtain a daily plan, or chat while the server supplies only tasks that pass server-side filtering. The design prioritizes clarity and speed of use via a cohesive dark/light theme system and streamlined navigation. Overall, WorkNest demonstrates practical integration of databases, RBAC-inspired access control, realtime systems, modern UI patterns, and generative AI in a single academic-ready software project.

*(Word count: ~182)*  

---

## 3. SYSTEM ARCHITECTURE

### 3.1 High-level architecture
WorkNest follows a classic **three-tier** pattern:

1. **Presentation layer (React SPA)** — Routing, layouts, contexts (auth, theme, socket).
2. **Application layer (Express + Socket.IO)** — REST controllers, JWT auth, validation, business rules, realtime channels.
3. **Data layer (MongoDB via Mongoose)** — Document collections for users, workspaces, projects, tasks, notes, messages.

The client calls `/api/*` over HTTP with `Authorization: Bearer <JWT>`. Concurrent users receive pushes over **Socket.IO** (e.g. `task-updated`, `new-message`).

### 3.2 Frontend, backend, database, and AI modules

| Layer | Module | Role |
|--------|--------|------|
| **Frontend** | Pages (`Dashboard`, `Tasks`, `Chat`, `Team`, `Notes`, `Reports`, `Settings`, `Calendar`, `ProjectDetail`, `Login`/`Register`) | User journeys and data display |
| **Frontend** | Layout (`Sidebar`, `Topbar`, `Layout`) | Navigation and shell |
| **Frontend** | Contexts (`AuthContext`, `SocketContext`, `ThemeContext`) | Global session, socket connection, theme |
| **Frontend** | Components | Kanban (`@hello-pangea/dnd`), AI panel, Pomodoro, modals |
| **Backend** | `routes/` + `controllers/` | HTTP API surface |
| **Backend** | `middleware/` | Auth (`verifyToken`), validation |
| **Backend** | `utils/` | Workspace/project access helpers, chat room persistence |
| **Backend** | `migrations/` | One-off data/schema alignment (projects, channels) |
| **Database** | Mongoose models | Entities and indexes |
| **AI** | `aiController` + Groq SDK | summarize, suggest-tasks, plan-day, prioritize, chat |

### 3.3 Data flow (step-by-step)

**Example — User edits a Kanban card**
1. User drags task in React; client calls REST `PUT /api/tasks/:id` (Bearer token attached by Axios interceptor).
2. Express `verifyToken` loads `req.userId`.
3. `taskController` checks workspace/project membership and permissions, updates MongoDB task document.
4. Client may emit Socket.IO `task-update` with `{ workspaceId, task }` (depending on frontend flow).
5. Server relays `task-updated` to `ws:<workspaceId>` and optionally `proj:<projectId>`.
6. Other connected browsers update UI without polling.

**Example — AI workspace chat**
1. User submits message in dashboard AI panel → `POST /api/ai/chat` with `{ message, workspaceId }`.
2. Server confirms user belongs to workspace; loads projects where user is a member; fetches related tasks and **filters** them with `filterTasksForUser` (manager vs member vs viewer rules).
3. Prompt is built with allowed task lines + user message; Groq returns text; JSON `{ reply }` is sent back.
4. Client renders cleaned plain text in chat bubbles.

**Example — Channel chat with attachment**
1. Client joins Socket room `join-room` with `roomId` (e.g. `channel_<workspaceId>_<slug>`).
2. On send, server may use `persistRoomMessage` to validate room, store `Message` with `roomId`, optional base64 attachment (size-capped), broadcast `new-message` to that room.

---

## 4. TECHNOLOGY STACK

### 4.1 Frontend (with reasons)
| Technology | Reason |
|------------|--------|
| **React 19** | Component model, large ecosystem, industry standard for SPAs |
| **Vite** | Fast dev server and optimized builds |
| **React Router** | Declarative routes and protected layouts |
| **Tailwind CSS 4** | Rapid, consistent styling and dark/light tokens |
| **Framer Motion** | Polish: transitions and micro-interactions |
| **Axios** | Interceptors for JWT and global 401 handling |
| **Socket.IO client** | Realtime task and chat updates |
| **@hello-pangea/dnd** | Accessible drag-and-drop Kanban |
| **Recharts** | Reports: area and pie charts from real task data |
| **react-hot-toast** | Non-blocking user feedback |
| **canvas-confetti** | Pomodoro completion feedback |

*Note: FullCalendar packages exist in dependencies; the calendar page may combine custom month UI with task due dates—check `Calendar.jsx` for exact behavior.*

### 4.2 Backend (with reasons)
| Technology | Reason |
|------------|--------|
| **Node.js + Express** | Lightweight HTTP API, easy middleware pipeline |
| **Socket.IO** | Bidirectional events for collaboration |
| **Mongoose** | Schema validation and indexing on MongoDB |
| **jsonwebtoken** | Stateless session tokens for SPAs |
| **bcryptjs** | Secure password hashing |
| **express-validator** | Input validation on sensitive routes |
| **cors** | Controlled cross-origin access for the dev client |
| **dotenv** | Environment-based configuration |

### 4.3 Database (with reasons)
| Technology | Reason |
|------------|--------|
| **MongoDB** | Flexible document model fits nested members, comments, channel lists |
| **Mongoose indexes** | Faster queries on `workspaceId`, `projectId`, `roomId`, etc. |

### 4.4 APIs / AI tools used
| Service | Purpose |
|---------|---------|
| **Groq API** (`groq-sdk`) | Hosted LLM inference (`llama-3.1-8b-instant` in code) |
| **Environment variables** | `GROQ_API_KEY`, `JWT_SECRET`, Mongo URI, `CLIENT_URL`, `PORT` |

---

## 5. FEATURES (VERY IMPORTANT)

### 5.1 Feature list with short explanations

1. **User registration & login**  
   New users register; passwords are hashed. Login returns JWT stored client-side; protected routes require authentication.

2. **JWT session handling**  
   Axios sends Bearer tokens; expired/invalid tokens clear storage and redirect to login.

3. **Multi-workspace model**  
   Users can belong to several workspaces with roles (admin, member, viewer). Active workspace tracked in client `localStorage`.

4. **Invite codes & join workspace**  
   Workspaces expose join codes; admins manage member roles inside the Team page.

5. **Projects inside workspaces**  
   Projects partition work with member lists (manager/member/viewer) and aggregate task statistics on dashboard cards.

6. **“General” / inbox project**  
   Utilities ensure workspace-level inbox so tasks always map to a `projectId`.

7. **Tasks: CRUD & fields**  
   Title, description, status (`todo` / `inprogress` / `done`), priority (`low` / `medium` / `high`), due dates, tags, assignments, ordering, timestamps.

8. **Task visibility logic**  
   Managers see all tasks in their project; members see assigned or visibility-scoped tasks; viewers are read-heavy per rules in `projectAccess`.

9. **Kanban board with drag-and-drop**  
   Move tasks across columns with optimistic UI synced via API and sockets where enabled.

10. **List/grid task views**  
    Alternative layouts for personal preference.

11. **Realtime task broadcasting**  
    Events such as task move/create/update/delete fan out per workspace/project rooms.

12. **Dashboard**  
    KPI-style cards (totals, projects, completions, efficiency), project progress, recent task table, Pomodoro, activity heatmap, quick notes, AI sidebar.

13. **Pomodoro timer**  
    Work/short/long session lengths stored in **user profile** via API and honored by the countdown UI with pause/reset/settings.

14. **Notes module**  
    Workspace-scoped notes with tags and editor flow (create/read/update).

15. **Calendar page**  
    Month view combining task deadlines and supplementary sample events where implemented.

16. **Reports page**  
    Charts derived from real API data—e.g., daily completions, priority distributions.

17. **Team / workspace overview**  
    Members, invites, workspace projects with join/open flows.

18. **Project detail**  
    Deep view for a single project with tasks and membership context.

19. **Slack-style Chat**  
    Channels from `chatChannels`, DMs with composed `roomId`, typing indicators, optional file attachments (base64 in DB with server limits).

20. **Messages REST**  
    Fetch history by `roomId` for reliable load after refresh.

21. **AI: Summarize**  
    Condense arbitrary text into bullet-style output.

22. **AI: Suggest tasks**  
    JSON or line-based task title suggestions from a project description prompt.

23. **AI: Plan day**  
    Plain-text prioritized schedule built from supplied task stubs.

24. **AI: Prioritize**  
    Structured ranking `{ title, reason }[]` parsed from LLM JSON.

25. **AI: Context-aware chat**  
    Chat merges user message with **filtered task list** for grounded answers.

26. **Theme switching**  
    Light/dark via CSS variables on `documentElement`.

27. **User profile tweaks**  
    Theme and Pomodoro settings persisted server-side (`/api/users/profile` pattern as used).

28. **Health check**  
    `GET /api/health` for uptime monitoring.

29. **Migrations on boot**  
    Safe alignment routines (projects + chat channels).

30. **Seed script**  
    Populate demo workspaces/users/tasks for demos (`npm run seed` on server).

### 5.2 Unique / innovative highlights
- **Server-enforced task visibility** for AI (not just client-side filtering)—reduces risk of leaking tasks the user should not see.
- **Dual chat architecture**: legacy workspace/project broadcast path plus **room-scoped** messages with persistence.
- **Heatmap activity** on dashboard from real `updatedAt`/`createdAt` signals.
- **Integrated Pomodoro** with **profile-synced** durations—not only localStorage.

---

## 6. MODULE-WISE EXPLANATION

| Module | Simple explanation |
|--------|--------------------|
| **Auth** | Register/login issues JWT; middleware guards private routes. |
| **Users** | Profile data: name, email, theme, Pomodoro settings, workspace memberships. |
| **Workspaces** | Container for people, projects, channels, invite codes. |
| **Projects** | Task boards with roles; links to workspace. |
| **Tasks** | Core work items; status/priority/due/assignees; indexed by workspace+project. |
| **Notes** | Lightweight documentation per workspace. |
| **Messages** | Chat records with optional `roomId` and attachment payload. |
| **Socket.IO gateway** | Join rooms (`ws:`, `proj:`, dynamic `roomId`); relay events. |
| **AI service** | Groq-backed endpoints; chat composes system prompt from allowed tasks. |
| **Access utils** | `workspaceAccess`, `projectAccess`, `chatRoom` coordinate “who can do what.” |
| **Client API layer** | Axios instance with base URL and auth header injection. |
| **UI shell** | Sidebar routes, top bar, workspace switcher logic in `App.jsx`. |

---

## 7. WORKING FLOW (USER JOURNEY)

1. User opens app → **Register** or **Login** → JWT stored.  
2. App loads **workspaces**; picks active workspace (or first available).  
3. **Dashboard** shows aggregate stats, projects, tasks, timer, heatmap, notes preview, AI.  
4. User opens **Tasks** → selects project → creates/edits tasks (modal) or moves Kanban cards.  
5. Changes propagate to DB; other members may see realtime updates via Socket.IO if connected.  
6. User collaborates on **Team** (invite/manage) and opens **Chat** → selects channel/DM → messages persist per room/workflow.  
7. User captures **Notes** and reviews **Reports** charts.  
8. **Settings / Profile** adjusts theme or Pomodoro lengths.  
9. On logout, token clears; guarded routes bounce to `/login`.

---

## 8. DATABASE DESIGN

MongoDB stores **documents** (analogous to rows) in **collections** (tables).

### 8.1 Collections / schemas (conceptual tables)

**users** — `User`  
Fields: name, email, hashed password (`select: false` by default), avatar, embedded `workspaces[]` `{ workspaceId, role }`, `pomodoroSettings`, `theme`, timestamps.

**workspaces** — `Workspace`  
Fields: name, description, owner, `members[]` `{ user, role }`, unique `inviteCode`, `projects[]` refs, `chatChannels[]` `{ slug, name }`, timestamps.

**projects** — `Project`  
Fields: name, description, `workspaceId`, `members[]` `{ user, role: manager|member|viewer }`, `createdBy`, color/icon, status, dueDate; index `{ workspaceId, name }`.

**tasks** — `Task`  
Fields: title, description, status, priority, assignees/back-compat `assignedTo`, `visibleTo`, dueDate, tags, `workspaceId`, `projectId`, `createdBy`, `order`, `comments[]`, timestamps. Pre-save syncs assignee arrays.

**notes** — `Note`  
Fields: title, content, emoji/color, `workspaceId`, `createdBy`, tags, timestamps; index on `updatedAt`.

**messages** — `Message`  
Fields: `workspaceId`, optional `projectId`, optional `roomId`, `sender`, `text`, optional `attachment { data, type, name }`, timestamps; compound indexes for listing.

### 8.2 Relationships (text ER-style)
- **User** ⟷ **Workspace**: many-to-many via `user.workspaces` and `workspace.members`.  
- **Workspace** → **Project**: one-to-many (`workspaceId` on project; optional `workspace.projects[]` cache).  
- **Project** → **Task**: one-to-many via `projectId`.  
- **Workspace** → **Note/Message**: one-to-many.  
- **User** → **Task** (assignments), **Message** (sender), **Note** (creator).

---

## 9. KEY ALGORITHMS / LOGIC USED

### 9.1 Access control
- **Workspace membership** checked before AI chat and many mutations.  
- **`userCanSeeTask` / `filterTasksForUser`**: combines project membership with role and assignment/`visibleTo` arrays to decide row visibility.

### 9.2 AI logic
- **Prompt construction** for chat: inject only allowed task lines as plain text to the system message.  
- **JSON cleanup** on client (`AIPanel`) strips markdown noise for readable bubbles.  
- **Model**: Groq `llama-3.1-8-instant` with bounded `max_tokens` and message size slices.

### 9.3 Realtime
- Socket rooms isolate traffic: broadcasting to `ws:<workspaceId>`, `proj:<projectId>`, or arbitrary `roomId`.

### 9.4 Optimizations & safeguards
- **MongoDB indexes** on hot query paths (`workspaceId`, `projectId`, `roomId`, `createdAt`).  
- **JSON body limits** and **attachment size caps** to avoid oversized payloads breaking the server.

### 9.5 Dashboard heatmap
- Calendar-week-aligned grid aggregates per-day counts of tasks whose `updatedAt`/`createdAt` matches local calendar days—visualizes workload without extra tables.

---

## 10. UI / UX EXPLANATION

### 10.1 Design approach
- **Modern dark-first product UI** using CSS variables (`index.css`) and optional **light theme**.  
- **Glass / gradient accents** on auth and select cards; **rounded cards** and **consistent purple/teal accent** family.  
- **Micro-interactions** via Framer Motion for perceived quality.

### 10.2 Why it is effective
- **Single navigation model** (sidebar) reduces cognitive load.  
- **Workspace context** always visible in top bar.  
- **Dashboard** answers “what should I care about now?” in one screen.  
- **Toasts** communicate errors without blocking flow.  
- **Kanban + list** modes respect different mental models for task triage.

---

## 11. ADVANTAGES OF THE PROJECT

- **All-in-one** workspace instead of separate Trello + Slack + notes + timer apps.  
- **Role-aware security** at workspace and project layers.  
- **Realtime collaboration** reduces stale boards.  
- **AI grounded in server-filtered tasks** is more defensible than generic chatbots for team data.  
- **Open-stack** teaching value: SPA + REST + WebSockets + NoSQL + third-party AI.

---

## 12. LIMITATIONS

- **Attachment storage** uses MongoDB/base64 payloads—fine for demos; large files deserve object storage (S3, etc.).  
- **MongoDB eventual consistency patterns** standard for demos; horizontal scaling beyond single replica set not covered.  
- **AI hallucination risk**: LLMs can still err; summaries should be curated for critical outcomes.  
- **Email verification / SSO** typically not implemented—only password auth presented.  
- **Automated integration tests** are not highlighted in repos without Jest/Vitest suites (see Testing).  
- **Offline mode** absent.

---

## 13. FUTURE SCOPE

- File uploads to cloud storage + signed URLs instead of oversized documents.  
- Push notifications/mobile app (React Native/PWA enhancements).  
- Granular audit logs and admin consoles.  
- Email invites and password reset flows.  
- AI tool-calling to create tasks directly (with strict validation).  
- Kubernetes/Docker Compose templates for one-command deploy.  
- Comprehensive automated test suite and CI pipeline.

---

## 14. TESTING

### 14.1 How the project was tested (as reflected in repo)
- **Manual end-to-end flows**: register/login, CRUD tasks, drag Kanban, switch workspace, chat send, AI endpoints with valid keys.  
- **ESLint** on the client (`npm run lint`) for static quality.  
- **API health** via `/api/health`.

### 14.2 Edge cases handled (examples)
- **401** invalid JWT → client clears session and redirects.  
- **Validation** on AI chat requires non-empty `message` and valid `workspaceId`.  
- **Socket** guards on typing events (must match socket user).  
- **Task assignee synchronization** middleware in Mongoose keeps legacy `assignees` aligned with `assignedTo`.  

### 14.3 Recommended additions for formal evaluation
Document **explicit test matrices** for each API route (status codes) and screenshots of UI journeys in an appendix PDF.

---

## 15. DEPLOYMENT

### 15.1 Run locally

**Prerequisites:** Node.js, MongoDB (local or Atlas), Groq API key (for AI routes).

**Server (`/server`):**
```bash
cd server
npm install
# Create .env with MONGODB_URI, JWT_SECRET, CLIENT_URL=http://localhost:5173, GROQ_API_KEY, PORT=5000
npm run dev
```

**Seed (optional):**
```bash
npm run seed
```

**Client (`/client`):**
```bash
cd client
npm install
# Optionally VITE_API_URL pointing to backend if not using proxy
npm run dev
```

Ensure Vite proxies `/api` to the backend (check `vite.config.js`) **or** set `VITE_API_URL`.

### 15.2 Production-style deployment (high level)

1. **Build client:** `npm run build` → host static assets (Netlify, Vercel, S3 + CloudFront).  
2. **Run API** on VPS or PaaS (Render, Railway, Fly.io): `node server/index.js` with production env vars.  
3. **Expose HTTPS** termination (reverse proxy/nginx).  
4. **Separate Mongo cluster** with backups.

---

## 16. VIVA QUESTIONS & ANSWERS (15–20)

1. **Q: Why MongoDB instead of SQL?**  
   **A:** Flexible nested structures (members, channels, comments) map naturally to documents; rapid iteration suits academic scope. PostgreSQL remains a valid alternate for stricter relational constraints.

2. **Q: How is authentication implemented?**  
   **A:** JWT signed with `JWT_SECRET`, sent via `Authorization` header after login/register; bcrypt stores password hashes server-side only.

3. **Q: How do you authorize API calls after login?**  
   **A:** `verifyToken` middleware decodes JWT, attaches `req.userId`, controllers check workspace/project participation.

4. **Q: What is Socket.IO used for?**  
   **A:** Bidirectional realtime: task broadcasts, typing indicators, online users, chat message fan-out—rooms named by workspace/project/room ids.

5. **Q: How does AI know about my tasks?**  
   **A:** `/api/ai/chat` loads tasks for projects where the user is a member and filters visibility before sending summaries to Groq inside the prompt.

6. **Q: Can a viewer see tasks they are not supposed to see?**  
   **A:** Viewer rules are tighter; managers typically see entire project scopes. The server-side `filterTasksForUser` enforces policy before prompting the LLM.

7. **Q: What prevents prompt injection breaking security?**  
   **A:** Data access is gated by JWT + Mongo queries; injections may skew wording but shouldn’t widen DB reads. Still sanitize outputs before acting on destructive instructions.

8. **Q: Why Groq API?**  
   **A:** Fast hosted inference accessible via HTTPS with simple SDK integration—good demo latency for coursework.

9. **Q: How are workspaces joined?**  
   **A:** Invite codes on workspace documents; admins share codes; endpoints join/update membership arrays.

10. **Q: What is the General project concept?**  
    **A:** Utility layer ensures orphan tasks attach to an inbox/general project tied to workspace creation/migration helpers.

11. **Q: How are chat channels represented?**  
    **A:** `workspace.chatChannels` carries slug/name pairs; sockets join deterministic `channel_<wid>_<slug>` room identifiers.

12. **Q: How are large uploads handled safely?**  
    **A:** Express/Socket payloads have configurable limits (`15mb`/attachment slice); production should offload files.

13. **Q: Frontend state management strategy?**  
    **A:** React component state plus contexts for authentication, theme, sockets—no Redux required for scoped scope complexity.

14. **Q: How would you horizontally scale realtime?**  
    **A:** Move Socket.IO to Redis adapter-backed cluster and sticky sessions/load balancer affinity.

15. **Q: What migrations run on startup?**  
    **A:** `migrateProjects` and `migrateChatChannels` ensure older databases align schemas for general projects and defaults.

16. **Q: Discuss one trade-off of SPA + JWT.**  
    **A:** XSS could leak tokens—mitigations include sanitizing inputs and preferring shorter-lived tokens or HttpOnly cookie patterns beyond current scope.

17. **Q: How do reports derive chart data?**  
    **A:** Client fetches tasks for workspace (`GET /tasks/:wid`) plus workspace metadata where needed, derives counts purely client-side via date filters.

---

## 17. PRESENTATION SCRIPT (3–5 MINUTES)

> “Good morning. I’m presenting **WorkNest**, our team productivity and collaboration platform.  
>  
> Teams today bounce between scattered tools for tasks, chat, docs, timers, and planning. WorkNest solves that by giving each **workspace** shared **projects**, **tasks**, **notes**, **real-time chat**, and **integrated Pomodoro** sessions—all behind secure login with **JWT** and MongoDB-backed data.  
>  
> Architecturally we use a React single-page frontend talking to Node and Express REST APIs plus **Socket.IO** for realtime updates—for example dragging a Kanban card or broadcasting new chat messages. Project members get **fine-grained visibility** rules so managers see full boards while viewers see read-only subsets, and importantly our **Groq-powered AI endpoints** reuse that same filtering so the assistant only sees tasks allowed for that logged-in user.  
>  
> Core features include **dashboard analytics**, Kanban/list views, Slack-style channels and **direct messages**, **reports with charts**, a **calendar** view around deadlines, and AI helpers to **summarize**, **brainstorm**, **plan the day**, and **prioritize**.  
>  
> We tested manually across auth, workspace switching, chats, timers, charts, plus linting on the client. Limitations today include storing raw attachment payloads—we’d move that to cloud storage next—and we'd add fuller automated testing in CI for production hardness.  
>  
> Overall WorkNest showcases full-stack fundamentals—SPA, JWT security, realtime channels, Mongo design, thoughtful RBAC-ish rules, modern UI, and generative AI integration—making it practical for coursework and plausible as a minimalist team suite. Thank you—happy to answer questions.”

*(Approx. spoken length: ~3½ minutes at moderate pace.)*

---

## 18. SLIDE CONTENT (PPT-READY OUTLINE)

| Slide # | Title | Bullets |
|--------|--------|---------|
| 1 | **WorkNest — Team Workspace Platform** | Your name · Roll no. · Mentor · Institution · Year |
| 2 | **Problem & Motivation** | Fragmented tools · Context switching · Weak team visibility · Need realtime + unified hub |
| 3 | **Objectives** | Single SPA for tasks/projects/chat · Secure roles · AI assist · Responsive UI |
| 4 | **System Architecture** | React ↔ REST + JWT ↔ MongoDB diagram; Socket.IO side channel arrows |
| 5 | **Tech Stack Overview** | React/Vite/Tailwind · Node/Express · Mongo/Mongoose · Socket.IO · Groq |
| 6 | **Core Modules** | Auth · Workspaces · Projects · Tasks · Notes · Messages · AI |
| 7 | **Feature Highlights — Collaboration** | Realtime Kanban · Channels & DMs · Invites · Project detail |
| 8 | **Feature Highlights — Productivity** | Dashboard · Pomodoro · Calendar · Reports/charts |
| 9 | **AI Integration** | Summarize/Suggest/Plan/Prioritize/Chat · Server-side task filtering |
| 10 | **Database Entities** | User, Workspace, Project, Task, Note, Message (+ keys in one-line each) |
| 11 | **Security & Roles** | JWT · bcrypt · workspace roles · project visibility algorithm (high level) |
| 12 | **Key Screenshots Placeholder** | Dashboard · Tasks Kanban · Chat · Reports |
| 13 | **Testing & QA** | Manual flows · Lint · Health endpoint · Mention future automated tests |
| 14 | **Limitations & Future Work** | File storage · SSO/email · Offline · CI/CD |
| 15 | **Demo Clip / Live Demo Plan** | 30s: login → dashboard → Kanban drag → AI chat snippet |
| 16 | **Conclusion** | Unified stack · Academic + practical learning · Q&A |

---

## Document control

**Prepared by:** Academic documentation generator based on automated repository analysis (`worknest`).  
**Path:** `/docs/WORKNEST_PROJECT_REPORT.md`  

*Align exact environment variable names with your `.env.example` if you maintain one.*
