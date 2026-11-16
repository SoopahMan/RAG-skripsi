# EduBot Pintar — Grade 5 IPAS Tutor

EduBot Pintar is a web application developed for an undergraduate thesis. It applies Retrieval-Augmented Generation (RAG) and Socratic prompting to Grade 5 natural and social sciences (IPAS). The tutor retrieves relevant passages from PDF learning materials and adapts its response to the student's level of understanding.

## Features

- **Interactive tutor** uses conversation history and reference materials to answer questions.
- **Three feedback modes** adjust how much guidance the tutor provides.

  | Mode | Tutor response |
  | --- | --- |
  | `belum_paham` | Guides the student with questions. |
  | `mulai_paham` | Offers hints and a partial explanation, then invites the student to continue reasoning. |
  | `paham` | Explains the concept in full and summarizes the material. |

- **PDF management** lets admins upload and delete documents and monitor indexing progress.
- **Practice, pre-tests, and post-tests** support learning activities and store test results in PostgreSQL.
- **JWT authentication** controls access to separate admin and student pages.

## How RAG works

1. The backend extracts text from PDFs and splits it into 1,000-character chunks with a 200-character overlap.
2. OpenAI Embeddings converts each chunk into a vector stored in ChromaDB. PostgreSQL stores document metadata, user accounts, and test results.
3. When a student asks a question, the retriever fetches up to five chunks from ChromaDB. LangGraph prepares the conversation history and selects a prompt for the current feedback mode.
4. GPT-4o mini generates a response using the retrieved context. The pipeline returns a fallback response when the context is insufficient.

## Tech stack and project structure

The frontend uses React, Vite, and Tailwind CSS. The backend uses FastAPI, SQLAlchemy, LangChain, LangGraph, and OpenAI. Docker Compose runs the services, and Nginx serves the frontend.

```text
RAG-skripsi/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI application and database initialization
│   │   ├── core/           # RAG pipeline, PDF ingestion, and authentication
│   │   └── endpoint/       # Chat, document, user, and test result APIs
│   ├── data/               # PDF storage mounted by Docker Compose
│   ├── chroma_db/          # Vector index mounted by Docker Compose
│   ├── testing/            # Evaluation dataset, runner, and metrics
│   └── results/            # Chunking and top-k comparison results
├── frontend/
│   └── src/                # React pages and API clients
└── docker-compose.yml
```

## Run locally

You need Git, Docker with Docker Compose, and an OpenAI API key. Run the following commands in PowerShell.

```powershell
git clone https://github.com/SoopahMan/RAG-skripsi.git
cd RAG-skripsi
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Set `OPENAI_API_KEY` and `JWT_SECRET_KEY` in `backend/.env`. Set `VITE_API_URL=http://localhost:8000` in `frontend/.env`. Keep secret values in your local `.env` file.

Before building the current checkout, add `uvicorn` to `backend/requirements.txt` so the backend image can run the ASGI server. To connect the document page to the local backend, update the API declaration in `frontend/src/pages/DocumentPage.jsx` to `const API = import.meta.env.VITE_API_URL;`. Vite reads this value at build time.

```powershell
docker compose up -d postgres
docker compose exec postgres pg_isready -U postgres -d ragdb
```

Repeat the readiness check until PostgreSQL reports `accepting connections`, then start the backend and frontend.

```powershell
docker compose up --build -d backend frontend
docker compose ps
```

On startup, the backend creates the database tables and the initial admin account. Find the initial sign-in details in [`backend/app/main.py`](backend/app/main.py). Change the initial password before giving others access.

- Open the frontend at [localhost:3000](http://localhost:3000).
- Open the interactive FastAPI documentation at [localhost:8000/docs](http://localhost:8000/docs).
- Run `docker compose logs -f backend frontend` to view service logs. Run `docker compose down` to stop the services.

### Configuration

| Variable | File | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | `backend/.env` | Authenticates requests to OpenAI chat and embedding models. |
| `JWT_SECRET_KEY` | `backend/.env` | Signs authentication tokens. |
| `JWT_ALGORITHM` | `backend/.env` | Sets the signing algorithm. Defaults to `HS256`. |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `backend/.env` | Sets token lifetime in minutes. Defaults to `60`. Use this variable name to override the lifetime. The current template lists `JWT_EXPIRED_MINUTES`. |
| `VITE_API_URL` | `frontend/.env` | Sets the backend URL the browser uses, such as `http://localhost:8000`. |

The current implementation defines the chat model, PostgreSQL URL, and `data/` and `chroma_db/` paths in code. Check `backend/app/config/database.py` and `docker-compose.yml` when changing PostgreSQL settings.

### Use the tutor

1. Sign in. To add learning materials, use an admin account to open the document page and upload a PDF.
2. Wait for indexing to finish. Open the chatbot and ask a question about the material. The main chatbot uses the `paham` mode.
3. Open the exercises page to take a pre-test or post-test. The tutoring session in the post-test flow adapts its mode based on student feedback.

## Research evaluation

[`backend/testing/`](backend/testing/) contains the evaluation dataset and a RAGAS-based runner. The evaluation checks whether answers are supported by the retrieved context, whether the tutor follows the Socratic feedback mode, and how it responds when supporting material is unavailable. Run the evaluation on a local copy because the runner temporarily adds test passages to ChromaDB.

After setting `OPENAI_API_KEY` in `backend/.env`, run these commands from the repository root with Python 3.12.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe testing/run_eval.py --category socratic_prompting --output hasil.csv
```

Use `--help` to see the available runner options. [`backend/results/`](backend/results/) contains the saved comparisons of chunking configurations and top-k values.
