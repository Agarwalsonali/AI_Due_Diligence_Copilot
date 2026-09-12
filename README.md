# AI Due Diligence Copilot

AI-powered due diligence workspace for analyzing companies, financial documents, risks, opportunities, and business questions. The application combines a Next.js dashboard with a FastAPI backend, PostgreSQL for application data, and Qdrant for document-vector search.

## Features

- User registration, login, JWT authentication, and protected dashboard access
- Company management and multi-company comparison
- Upload and process financial documents, including PDF and DOCX files
- Financial metric extraction, ratios, trends, CAGR, and financial-health assessment
- Risk, opportunity, and executive-summary analysis
- Retrieval-augmented chat with hybrid BM25/vector retrieval, reranking, and source citations
- Report generation and download
- Persistent document uploads and vector indexes

## Architecture

```text
Next.js frontend (port 3000)
          |
          v
FastAPI backend (port 8000) ---- PostgreSQL (port 5432)
          |
          +--------------------- Qdrant (port 6333)
```

### Main technologies

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI, Recharts
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic, Uvicorn
- **Storage:** PostgreSQL 16 and Qdrant
- **AI/RAG:** OpenAI-compatible chat and embedding APIs, BM25, vector retrieval, lexical reranking
- **Documents:** PyMuPDF and python-docx
- **Reports:** fpdf2

## Prerequisites

- Docker Desktop with Docker Compose
- A Google Gemini API key (free tier available)

For non-Docker development, install Python 3.12+, Node.js 20+, PostgreSQL, and Qdrant separately.

## Configuration

The repository includes `.env.example`. Create or update a root `.env` file before starting the backend:

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

The Gemini API free tier provides generous limits suitable for development and demonstration purposes.

### Environment Variables

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=due_diligence
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/due_diligence

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=documents

# LLM Provider Configuration
LLM_PROVIDER=gemini

# Gemini Configuration (Default Provider)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash

# OpenAI Configuration (Optional - for backward compatibility)
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Embeddings (still uses OpenAI-compatible endpoint)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Auth
JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# App
CORS_ORIGINS=http://localhost:3000
UPLOAD_DIR=data/uploads
MAX_FILE_SIZE_MB=50
```

### LLM Provider Options

The application supports multiple LLM providers through a provider abstraction layer:

- **gemini** (default): Uses Google Gemini API with free tier support
- **openai**: Uses OpenAI API (requires OpenAI API key and credits)

To switch providers, set `LLM_PROVIDER=gemini` or `LLM_PROVIDER=openai` in your `.env` file.

### Free Tier Limits

When using the Gemini free tier, the application will gracefully handle rate limits and quota exhaustion. If you encounter usage limits:

1. Wait a few minutes and try again
2. Consider upgrading to a paid Gemini plan for higher limits
3. Switch to OpenAI provider if you have OpenAI credits

The application will display a clear message when limits are reached and will not retry indefinitely.


## Run with Docker Compose

From the project root:

```bash
docker compose up --build
```

Open the application at [http://localhost:3000](http://localhost:3000).

The backend API is available at [http://localhost:8000](http://localhost:8000), with interactive OpenAPI documentation at [http://localhost:8000/docs](http://localhost:8000/docs). Check service health at [http://localhost:8000/api/health](http://localhost:8000/api/health).

To stop the services:

```bash
docker compose down
```

To stop the services and remove persisted PostgreSQL/Qdrant volumes:

```bash
docker compose down -v
```

Uploaded documents are stored under `data/uploads`. PostgreSQL and Qdrant data are persisted in Docker volumes.

## API overview

All application routes are prefixed with `/api`:

- `/api/auth` — register, login, current user, and logout
- `/api/companies` — create, list, view, delete, and analyze companies
- `/api/documents` — upload, list, view, and delete documents
- `/api/chat` — ask questions and manage chat sessions
- `/api/analysis` — financials, health, risks, opportunities, summaries, comparisons, and regeneration
- `/api/reports` — generate, view, and download reports
- `/api/health` — service health check

Most application endpoints require a valid authenticated session.

## Local development

### Backend

Create a virtual environment, install dependencies from `backend/requirements.txt`, set the environment variables above, and run the FastAPI server from the `backend` directory:

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

For local services, update `DATABASE_URL` and `QDRANT_URL` to point to your local PostgreSQL and Qdrant instances rather than the Compose service names.

### Frontend

From the `frontend` directory:

```bash
npm install
npm run dev
```

The frontend defaults to `http://localhost:8000` for the backend. Override it when needed with `NEXT_PUBLIC_API_URL`.

## Testing

Run the backend tests from the `backend` directory:

```bash
python -m pytest -v
```

The test suites cover financial calculations and analysis as well as BM25 search, hybrid retrieval, reranking, context construction, source citations, and related RAG behavior.

For the frontend:

```bash
npm run lint
npm run build
```

## Project structure

```text
backend/
  app/
    analysis/       Financial health, risk, opportunity, and summary logic
    api/            FastAPI route handlers
    database/       SQLAlchemy models, schemas, and database setup
    financial/      Metric extraction, ratios, and trend analysis
    rag/            Parsing, chunking, embeddings, retrieval, reranking, and generation
    services/       Company, document, and report services
  tests/            Backend unit tests
frontend/
  src/app/          Next.js pages and layouts
  src/components/   Reusable dashboard, chat, analysis, and UI components
data/uploads/       Uploaded document storage
```

