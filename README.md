# AI-Powered Fintech Chatbot

An intelligent customer support chatbot built with React Router, FastAPI, and DSPy RAG (Retrieval-Augmented Generation).

## Features

- 🤖 AI-powered responses using OpenAI GPT-4o
- 🔍 RAG (Retrieval-Augmented Generation) with Pinecone vector database
- 🔐 Authentication with WorkOS AuthKit
- 💬 Real-time chat interface with optimistic UI
- ♾️ Infinite scroll chat history
- 📱 Responsive design with Tailwind CSS
- 🐳 Docker containerized deployment

## Tech Stack

### Frontend

- **React Router v7** - Full-stack React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Prisma** - Database ORM
- **WorkOS AuthKit** - Authentication

### Backend

- **FastAPI** - Python web framework
- **DSPy** - Framework for programming with language models
- **OpenAI** - Language model API
- **Pinecone** - Vector database for RAG
- **PostgreSQL** - Primary database

## Prerequisites

- Docker and Docker Compose
- Environment variables (see setup below)

## Quick Start

### 1. Clone and Setup Environment

```bash
git clone <repository-url>
cd eloquent-chatbot-challenge
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your API keys:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-powered-chatbot-challenge
PINECONE_ENVIRONMENT=us-east-1

# WorkOS AuthKit Configuration
WORKOS_API_KEY=your_workos_api_key_here
WORKOS_CLIENT_ID=your_workos_client_id_here
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
WORKOS_COOKIE_PASSWORD=your-workos-cookie-password-32-chars-min

# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here
SESSION_SECRET=your-session-secret-key-here
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

This will:

- Build all Docker images
- Start PostgreSQL database
- Run Prisma migrations
- Start the backend API server
- Start the frontend application

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Architecture

### Docker Services

The application runs in 4 Docker containers:

1. **database** - PostgreSQL 15 with health checks
2. **migrate** - One-time migration service using Prisma
3. **backend** - FastAPI server with DSPy RAG implementation
4. **frontend** - React Router application

### Database Migrations

Migrations are handled by a separate Docker service that:

- Waits for the database to be healthy
- Runs `prisma migrate deploy`
- Exits successfully after applying migrations
- Frontend service waits for migration completion before starting

### RAG Implementation

The backend uses DSPy for structured prompting with:

- Document retrieval from Pinecone vector database
- Context-aware response generation
- Similarity threshold filtering
- Configurable top-k results

## Development

### Frontend Development

```bash
cd front-end
pnpm install
pnpm run dev
```

### Backend Development

```bash
cd services/server
uv sync
uv run fastapi dev app/main.py
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset
```

## Environment Variables

### Required Variables

| Variable            | Description                          |
| ------------------- | ------------------------------------ |
| `OPENAI_API_KEY`    | OpenAI API key for GPT-4o            |
| `PINECONE_API_KEY`  | Pinecone API key for vector database |
| `WORKOS_API_KEY`    | WorkOS API key for authentication    |
| `WORKOS_CLIENT_ID`  | WorkOS client ID                     |
| `POSTGRES_PASSWORD` | PostgreSQL database password         |

### Optional Variables

| Variable               | Default | Description                       |
| ---------------------- | ------- | --------------------------------- |
| `SIMILARITY_THRESHOLD` | 0.7     | RAG similarity threshold          |
| `TOP_K_RESULTS`        | 3       | Number of RAG results to retrieve |
| `LOG_LEVEL`            | info    | Backend logging level             |

## Troubleshooting

### Common Issues

1. **Frontend can't connect to backend**

   - Ensure `AI_SERVICE_URL=http://backend:80` in `.env`
   - Restart with `docker-compose down && docker-compose up`

2. **Migration fails**

   - Check database connection
   - Verify `DATABASE_URL` format
   - Ensure PostgreSQL is healthy before migration runs

3. **Authentication not working**
   - Verify WorkOS configuration
   - Check redirect URI matches your domain
   - Ensure cookie password is at least 32 characters

### Logs

View service logs:

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend
docker-compose logs database
```

## API Endpoints

### Authentication

- `GET /auth/login` - Login page
- `GET /auth/callback` - OAuth callback
- `POST /auth/logout` - Logout

### Chat

- `GET /chat/:sessionId` - Chat interface
- `POST /chat/:sessionId` - Send message
- `GET /chat/:sessionId/messages` - Load messages

### Backend API

- `POST /chat` - Send chat message
- `GET /health` - Health check
- `GET /docs` - API documentation
