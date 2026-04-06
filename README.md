# DocSMart
An AI-powered document question-answering web application built with cloud-native architecture.

---

## Project Overview
DocSMart allows users to upload documents and ask natural-language questions about their contents.  
Using Retrieval-Augmented Generation (RAG), the system provides accurate answers **strictly based on uploaded documents**.

---

## Tech Stack

### Frontend
- Next.js
- Tailwind CSS

### Backend
- Azure Functions (Python)
- PostgreSQL (local, Docker)
- pgvector (semantic search)

### AI
- Azure OpenAI
- Text embeddings
- Vector similarity search

### Authentication
- Firebase Authentication

---

## Prerequisites

Make sure you have installed:
- Node.js 18+
- Python 3.10+
- Docker Desktop
- Azure Functions Core Tools
- Firebase CLI (optional for emulator)

---

## How to Run Locally

### 1 Clone the Repository
```bash
git clone <repo-url>
cd DocSMart

### 2 PostreSQl setup
cd db
docker compose up -d

### 3 Databas schema
docker exec -it docsmart-postres psql -U docsmart -d docsmart
\i schema.sql
\q
cd..

### 4 Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
azurite
func start

### 5 Frontend - new Terminal
cd frontned
npm install
npm run dev


Postregs - localhost:5432
Backend - http://localhost:7071
frontend - http://localhost:3000