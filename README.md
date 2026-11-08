# BugSense AI

> AI-powered bug tracking SaaS. Linear-level polish, Gemini-powered intelligence.

---

## 1. Overview & Vision
BugSense AI is a high-performance, developer-first bug tracking application built to eliminate the friction in issue management. Inspired by the speed and aesthetic craft of Linear, it leverages Google Gemini models to automate issue classification, priority and severity suggestion, duplicate detection with vector embeddings, and plain-English issue summarization.

---

## 2. Core Features
- **Instant Issue Capture & Keyboard-First UX**: Global command palette (`Cmd/Ctrl+K`), quick shortcuts, optimistic UI updates.
- **AI Triage Assistant**: Convert messy error logs or bug descriptions into structured, prioritized, and labeled issues.
- **Semantic Duplicate Detection**: Real-time duplicate warnings using `pgvector` embeddings before filing redundant tickets.
- **Interactive Kanban Board & List Views**: Fluid drag-and-drop board powered by `@dnd-kit` and Framer Motion with real-time status transitions.
- **Comprehensive Project Analytics**: Actionable engineering metrics, resolution velocity, and workload distribution.

---

## 3. Architecture & Tech Stack

```
React 18 SPA (Vite + TS + Tailwind + shadcn/ui)
       │
       │ HTTPS + Bearer JWT
       ▼
Django 5 REST API (Python 3.12)
       │
       ├──► PostgreSQL 16 (+ pgvector)
       └──► Google Gemini API (google-genai SDK)
```

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, Django 5, Django REST Framework, SimpleJWT, drf-spectacular |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Framer Motion |
| **Database** | PostgreSQL 16 with `pgvector` extension |
| **AI Intelligence** | Google Gemini API (`google-genai` SDK) |
| **Tooling & CI** | Ruff, ESLint, Prettier, pytest, GitHub Actions |

---

## 4. Repository Structure

```text
BugSence/
├── bugsense-Docs/       # Architecture context, feature specifications & tracker
├── backend/             # Django 5 REST Framework service
│   ├── apps/            # Modular domain apps (users, projects, issues, ai, etc.)
│   ├── common/          # Shared permissions, pagination, and exceptions
│   ├── config/          # Split settings (base, dev, prod), urls, wsgi
│   └── tests/           # App test suites with pytest & factory_boy
├── frontend/            # React 18 + Vite + TypeScript application
│   └── src/
│       ├── app/         # Routes and providers
│       ├── components/  # Shared and shadcn/ui primitives
│       ├── features/    # Domain-specific components, hooks, and types
│       └── lib/         # API clients and utilities
├── .github/             # GitHub Actions CI workflows
├── docker-compose.yml   # Local PostgreSQL 16 + pgvector container
└── README.md
```

---

## 5. Getting Started (Development Setup)

### Prerequisites
- Python 3.12+ (or `uv`)
- Node.js 20+ & npm
- Docker & Docker Compose (for PostgreSQL + pgvector)

### Backend Setup
1. Navigate to `backend/`:
   ```bash
   cd backend
   uv venv
   source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
   uv pip install -r requirements.txt
   ```
2. Configure `.env` from template:
   ```bash
   cp .env.example .env
   ```
3. Run migrations and start dev server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

---

## 6. License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
