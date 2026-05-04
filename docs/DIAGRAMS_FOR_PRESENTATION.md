# WorkNest — Diagrams for Presentation & Viva

Copy each Mermaid block into [Mermaid Live Editor](https://mermaid.live) or VS Code preview / Google Slides Mermaid addon to export as PNG/SVG for PPT.

---

## 1. ER Diagram

```mermaid
erDiagram
    USER {
        ObjectId id PK
        string name
        string email UK
        string password_hash
        object pomodoro_settings
        string theme
    }

    WORKSPACE {
        ObjectId id PK
        string name
        string description
        ObjectId owner_id FK
        string invite_code UK
    }

    WS_MEMBERSHIP {
        ObjectId workspace_id FK
        ObjectId user_id FK
        string role_ws
    }

    PROJECT {
        ObjectId id PK
        string name
        ObjectId workspace_id FK
        ObjectId created_by FK
        string status
        string color
    }

    PJ_MEMBERSHIP {
        ObjectId project_id FK
        ObjectId user_id FK
        string role_proj
    }

    TASK {
        ObjectId id PK
        string title
        string status
        string priority
        date due_date
        ObjectId workspace_id FK
        ObjectId project_id FK
        ObjectId created_by FK
    }

    NOTE {
        ObjectId id PK
        string title
        string content
        ObjectId workspace_id FK
        ObjectId created_by FK
    }

    MESSAGE {
        ObjectId id PK
        string text
        string room_id
        ObjectId workspace_id FK
        ObjectId project_id FK
        ObjectId sender_id FK
    }

    USER ||--o{ WS_MEMBERSHIP : ""
    WORKSPACE ||--o{ WS_MEMBERSHIP : ""
    USER ||--o{ WORKSPACE : "owns"
    WORKSPACE ||--o{ PROJECT : ""
    USER ||--o{ PJ_MEMBERSHIP : ""
    PROJECT ||--o{ PJ_MEMBERSHIP : ""

    PROJECT ||--o{ TASK : ""
    WORKSPACE ||--o{ TASK : "duplicate FK scope"
    USER ||--o{ TASK : "creates assigns"
    USER ||--o{ NOTE : "creates"
    WORKSPACE ||--o{ NOTE : ""
    USER ||--o{ MESSAGE : "sends"
    WORKSPACE ||--o{ MESSAGE : ""
    PROJECT ||--o{ MESSAGE : ""
```

**Viva explanation (ER):** This diagram maps MongoDB **documents to ER entities**—**WS_MEMBERSHIP** and **PJ_MEMBERSHIP** stand for embedded member arrays linking users to workspaces and projects with **roles**. **TASK** hangs off both **workspace and project**, matching the schema requirement for every task to sit under a project in a workspace. **MESSAGE** optionally adds **project** or **room** scoping so channel chat is separate from board data.

---

## 2. Data Flow Diagram — Level 0 (Context)

*Level 0 shows the system as one process and flows from external entities.*

```mermaid
flowchart LR
    subgraph Entities["External entities"]
        A[("👤 Users\n(Browsers)")]
        E[("🤖 Groq AI\n(Cloud LLM API)")]
    end

    S[[("⚙️ WorkNest\nSystem\n( SPA + REST + WebSockets )\n─────────────────\nNode · Express · Socket.IO\nMongoDB")]]

    subgraph Storage["Persisted store"]
        D[("📦 MongoDB\nDatabase")]
    end

    A <-->|HTTP/HTTPS\nJSON + JWT| S
    A <-->|Socket.IO\nreal-time events| S
    S <-->|Mongoose\nqueries writes| D
    S <-->|HTTPS\nGroq SDK| E
```

**Simpler PPT variant (minimal — text boxes over diagram):**

```mermaid
flowchart TB
    U[External: User browsers]
    G[External: Groq API]
    M[External: MongoDB]

    SYS((LEVEL 0\nWorkNest\nCollaboration Platform))

    U <-->|Authenticated API + realtime| SYS
    SYS <-->|Reads / writes docs| M
    SYS <-->|Inference requests\nAPI key server-side| G
```

**Viva explanation (DFD‑0):** **Level 0** is the **system context**: users interact only with WorkNest via **REST + JWT** and **Socket.IO**; the application reads/writes **MongoDB**, and optionally calls **Groq** from the server. No internal breakdown—good for answering “who talks to whom.”

---

## 3. Data Flow Diagram — Level 1

*Processes represent major subsystems; data stores labelled D numbered for DB areas.*

```mermaid
flowchart TB
    U[👤 Users\nWeb clients]

    subgraph P ["Processes (inside WorkNest app)"]
        P1[["P1 Authentication\nRegister • Login • JWT issue"]]
        P2[["P2 Workspace & team\ninvite • roles • switching"]]
        P3[["P3 Projects & tasks\nCRUD Kanban REST + sockets"]]
        P4[["P4 Messaging\nchannels DM persist broadcast"]]
        P5[["P5 Notes & calendar\nreports views"]]
        P6[["P6 AI service\nGroq summarise plan chat filter"]]
    end

    D1[(D1 Users\nsessions prefs)]
    D2[(D2 Workspaces\nprojects refs)]
    D3[(D3 Tasks\nassignments comments)]
    D4[(D4 Messages\nrooms attachments)]
    D5[(D5 Notes\ntags content)]
    G["Groq\nLLM API"]

    U -->|credentials| P1
    P1 <--> D1
    U -->|authorized requests| P2
    P2 <--> D2
    U --> P3
    P3 <--> D3
    P3 <-->|broadcast| U
    U --> P4
    P4 <--> D4
    U --> P5
    P5 <--> D5
    P5 <-->|derived stats| U
    U --> P6
    P6 <--> G
    P6 <--> D3
    P2 <--> D1
```

**Viva explanation (DFD‑1):** **Level 1** splits WorkNest into **logical subprocesses**: identity, teamwork, tasks (with realtime), chat storage, secondary views (notes/reports/dashboard data), and **AI**. Data stores map to Mongo **collections logically**—tasks feed both UI and filtered AI prompts; chat is isolated from Kanban mutations.

---

## 4. Use Case Diagram

*Generalized actors and system boundary (suitable for PPT).*  

```mermaid
flowchart TB
    subgraph Actors
        AU((Guest /\n Visitor))
        RU((Registered\n User))
        AD((Workspace\n Admin))
    end

    subgraph WorkNest_boundary[" ─── WorkNest System ───"]
        UC_AU_1[**Register • Login • View landing**]

        UC_RU[**Select workspace**\nDashboard • Reports • Calendar • Pomodoro]
        UC_RU2[**Browse / manage tasks**\nList • Kanban • assign • due dates]
        UC_RU3[**Notes CRUD**]
        UC_RU4[**Chat • channels • DMs**\nattachments optional]
        UC_RU5[**AI assist**\nchat • summarise • suggest • plan]

        UC_AD[**Manage workspace**\ninvite code • members • roles]
        UC_AD2[**Manage projects**\ncreate • members • detail view]
    end

    AU --> UC_AU_1
    RU --> UC_AU_1
    RU --> UC_RU
    RU --> UC_RU2
    RU --> UC_RU3
    RU --> UC_RU4
    RU --> UC_RU5
    AD --> UC_AD
    AD --> UC_AD2
    AD --> UC_RU
    AD --> UC_RU2
    AD --> UC_RU5
```

**Alternative — classic use-case style labels only (even cleaner for slides):**

```mermaid
graph LR
    subgraph System[WorkNest]
        uc1(Create account / Login)
        uc2(Manage workspace & projects)
        uc3(Manage tasks Kanban/List)
        uc4(Chat & realtime)
        uc5(Notes)
        uc6(View dashboard & reports)
        uc7(Use Pomodoro & profile)
        uc8(AI assistant)
    end

    Guest(Guest)--> uc1

    Member(Team Member)--> uc3
    Member--> uc4
    Member--> uc5
    Member--> uc6
    Member--> uc7
    Member--> uc8

    Admin(Workspace Admin)--> uc2
    Admin--> uc3
    Admin--> uc4
    Admin--> uc8
```

**Viva explanation (Use Case):** **Actors** are **Guests** (minimal), **Members** doing daily task/chat/note/report work, and **Admins** handling **invite and membership**. Use cases bundle **frequency** workflows (Kanban vs AI) so examiners see **role separation** without listing every API route.

---

## Quick PPT tips

| Diagram | Tip |
|--------|-----|
| ER | Export wide layout; keep only one relationship line per pair on slide if crowded. |
| DFD‑0 | One slide; emphasise “browser → app → DB + AI”. |
| DFD‑1 | Optional second slide; number P1–P6 to match your oral script. |
| Use case | Use the second (graph LR) variant if space is tight. |

---

*Generated for WorkNest repository — align names with your final report if you rename modules.*
