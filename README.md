# Story Together

---

## Project Structure

```
├── artifacts/                    # Application packages
│   ├── api-server/              # Backend API server
│   ├── story-app/               # Frontend React application
│   └── mockup-sandbox/          # Development mockups
├── lib/                         # Shared libraries
│   ├── api-client-react/        # React API client
│   ├── api-spec/                # OpenAPI specifications
│   ├── api-zod/                 # Zod schemas
│   ├── db/                      # Database utilities
│   └── integrations-openrouter-ai/ # AI integration
├── scripts/                     # Utility scripts
├── Dockerfile.api               # API server container
├── Dockerfile.app               # Frontend container
├── docker-compose.yml           # Service orchestration
├── .dockerignore               # Docker build exclusions
├── .env.example                # Environment template
├── .env                        # Local environment (gitignored)
├── start-services.sh           # Development startup script
├── troubleshoot.sh             # Diagnostic script
└── pnpm-workspace.yaml         # Workspace configuration
```

---

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL database

---

## Configuration

### `artifacts/api-server/config.json`

OpenRouter settings are read from this file **first**, before falling back to environment variables. Leave fields empty to use the environment variable fallback.

```json
{
  "openrouter": {
    "apiKey": "",
    "apiUrl": "",
    "model": ""
  }
}
```

| Field    | Env var fallback                          | Description                                      |
|----------|-------------------------------------------|--------------------------------------------------|
| `apiKey` | `AI_INTEGRATIONS_OPENROUTER_API_KEY`      | Your OpenRouter API key                          |
| `apiUrl` | `AI_INTEGRATIONS_OPENROUTER_BASE_URL`     | OpenRouter base URL                              |
| `model`  | `OPENROUTER_MODEL`                        | Model ID, e.g. `meta-llama/llama-4-scout`        |

### Environment variables

| Variable                               | Required | Description                              |
|----------------------------------------|----------|------------------------------------------|
| `DATABASE_URL`                         | Yes      | PostgreSQL connection string             |
| `PORT`                                 | No       | API server port (default: `8080`)        |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY`   | No*      | Fallback OpenRouter API key              |
| `AI_INTEGRATIONS_OPENROUTER_BASE_URL`  | No*      | Fallback OpenRouter base URL             |

\* Required if `config.json` fields are empty and you are not running on Replit with managed keys.

---

## Docker Configuration

This project includes a complete Docker setup for development and deployment:

### Docker Files

| File | Description |
|------|-------------|
| `docker-compose.yml` | Main orchestration file defining all services (db, api, app) |
| `Dockerfile.api` | Multi-stage build for the API server |
| `Dockerfile.app` | Multi-stage build for the frontend application |
| `.dockerignore` | Excludes unnecessary files from Docker build context |
| `.env.example` | Template for environment variables |
| `.env` | Local environment configuration (gitignored) |

### Services

- **db**: PostgreSQL 16 database with health checks
- **api**: Node.js API server on port 8080 with OpenRouter integration
- **app**: Vite-based React frontend on port 5173

### Environment Variables

The following environment variables are required and configured via `.env`:

```bash
# Database
DATABASE_URL=postgresql://story:story@db:5432/story_together

# API Server
PORT=8080

# OpenRouter AI Integration
AI_INTEGRATIONS_OPENROUTER_API_KEY=your-openrouter-api-key-here
AI_INTEGRATIONS_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=meta-llama/llama-4-scout

# Development
LOG_LEVEL=debug
NODE_ENV=development
```

### Development Scripts

| Script | Description |
|--------|-------------|
| `./start-services.sh` | Start all services with logging and health checks |
| `./start-services.sh --build` | Force rebuild images before starting |
| `./troubleshoot.sh` | Comprehensive diagnostics and logging |

---

## Running without Docker

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your actual values
```

Or export variables in your shell:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/story_together"
export AI_INTEGRATIONS_OPENROUTER_API_KEY="sk-or-..."
export AI_INTEGRATIONS_OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

### 3. Run database migrations

```bash
pnpm --filter @workspace/db run push
```

### 4. Start the API server

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

### 5. Start the frontend (in a separate terminal)

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/story-app run dev
```

The app will be available at `http://localhost:5173`.

---

## Running with Docker Compose

### Quick Start

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your OpenRouter API key
# Then start all services:
./start-services.sh
```

### Manual Setup

#### 1. Set environment variables

Copy and configure the environment file:

```bash
cp .env.example .env
# Edit .env with your actual OpenRouter API key and other values
```

#### 2. Build and start all services

```bash
docker-compose up --build
```

Or use the provided script:

```bash
./start-services.sh
```

The app will be available at `http://localhost:5173`.

#### 3. Run database migrations (first time only)

```bash
docker-compose exec api pnpm --filter @workspace/db run push
```

### Development Workflow

| Command | Description |
|---------|-------------|
| `./start-services.sh` | Start all services (skip build if images exist) |
| `./start-services.sh --build` | Force rebuild all images |
| `./troubleshoot.sh` | Run diagnostics if services fail |
| `docker-compose logs -f` | Follow all service logs |
| `docker-compose restart` | Restart all services |
| `docker-compose down` | Stop all services |

### Troubleshooting

If services fail to start:

1. Run `./troubleshoot.sh` for detailed diagnostics
2. Check logs: `docker-compose logs api`
3. Verify `.env` file has correct values
4. Try force rebuild: `./start-services.sh --build`

---

## API Documentation (Swagger UI)

Interactive API docs are served by the API server at:

```
http://localhost:8080/api/docs
```

The raw OpenAPI JSON is available at:

```
http://localhost:8080/api/docs/openapi.json
```

If you change `PORT`, swap `8080` for your value.

To print the URL from the shell:

```bash
pnpm docs
# or, with a custom port:
PORT=8080 pnpm docs
```

The Swagger UI is mounted automatically when the API server starts — no extra
process is needed. The spec is loaded from `lib/api-spec/openapi.yaml`.

---

## Where to find error logs

### Server (API backend) logs

**Development (without Docker):**
The API server uses [Pino](https://github.com/pinojs/pino) structured JSON logging. All logs go to `stdout`. Run with pretty-printing:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev | pnpm exec pino-pretty
```

Errors appear as `"level": 50` (ERROR) entries in the JSON stream.

**With Docker Compose:**
```bash
docker-compose logs api
docker-compose logs -f api   # follow in real time

# Or use the troubleshooting script for comprehensive diagnostics:
./troubleshoot.sh
```

**On Replit:** Open the "Start Backend" workflow console in the workspace.

### Client (browser frontend) logs

All frontend errors are logged to the **browser developer console**:

- Chrome / Edge: `F12` → **Console** tab
- Firefox: `F12` → **Console** tab

Filter by `Error` level to see only errors. Network errors (failed API calls) also appear in the **Network** tab.

**On Replit:** The browser console output is captured and visible in the agent workspace console panel.

---

## Key commands

### Development Scripts
| Command                                          | Description                                  |
|--------------------------------------------------|----------------------------------------------|
| `./start-services.sh`                            | Start all Docker services                    |
| `./start-services.sh --build`                    | Force rebuild and start services             |
| `./troubleshoot.sh`                              | Run comprehensive diagnostics                |

### Package Management
| Command                                          | Description                                  |
|--------------------------------------------------|----------------------------------------------|
| `pnpm install`                                   | Install all workspace dependencies           |
| `pnpm run build`                                 | Build all packages                           |
| `pnpm run typecheck`                             | Type-check all packages                      |
| `pnpm --filter @workspace/db run push`           | Push DB schema changes                       |
| `pnpm --filter @workspace/api-spec run codegen`  | Regenerate API hooks and Zod schemas         |

### Service Management
| Command                                          | Description                                  |
|--------------------------------------------------|----------------------------------------------|
| `pnpm --filter @workspace/api-server run dev`    | Start API server in dev mode                 |
| `pnpm --filter @workspace/story-app run dev`     | Start frontend dev server                    |
| `docker-compose logs -f`                          | Follow all service logs                      |
| `docker-compose restart`                          | Restart all services                         |
| `docker-compose down`                             | Stop all services                            |


---

- create openrouter configuration

```sh
#to set openrouter access - update config file:
cp artifacts/api-server/config.json.example artifacts/api-server/config.json
```

- start client/server:
```sh
scripts/init.app.sh restart
```

- view logs:
```sh
tail -f artifacts/api-server/logs/server.log
tail -f artifacts/api-server/logs/openrouter.log
```