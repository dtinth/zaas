# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun run dev` - Start development server with auto-reload on port 32700 (or PORT env var)
- `bun run test` - Run tests (currently not configured)
- `bun run db:push` - Push schema changes to database (for development)
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Apply migrations

## Architecture

This is zaas (Zip-as-a-Service), a TypeScript microservice built with:
- **Elysia** - Web framework for Bun runtime
- **Drizzle ORM** - Database ORM with SQLite
- **Bun** - JavaScript runtime and package manager
- **Swagger** - API documentation via @elysiajs/swagger

### Project Structure

- `src/server.ts` - Main server with all API endpoints
- `src/auth.ts` - Authentication middleware for API keys and master keys
- `src/db/` - Database configuration and schema
  - `index.ts` - Database connection setup
  - `schema.ts` - Database schema definitions
- `drizzle.config.ts` - Drizzle ORM configuration
- `.env` - Environment variables (DATABASE_URL, MASTER_API_KEYS, PORT)

### Core Concepts

zaas implements a "zipper" pattern where:
- **Items** are predefined resources (e.g., promotional codes)
- **Requestors** are identifiers for entities requesting items (e.g., user IDs)
- **Namespaces** provide multi-tenant isolation
- **API Keys** control access to specific namespaces
- **Master API Keys** manage the API key system

### Database Schema

- `items` table: (id, namespace, item, requestor, matched_at, created_at, deleted_at)
- `api_keys` table: (id, api_key, namespace, created_at, deleted_at)

Both tables use soft deletion (deleted_at field) to maintain referential integrity.

### Authentication

Two-tier authentication system:
1. **Regular API keys**: Namespace-scoped access for item operations
2. **Master API keys**: Admin access for API key management (from MASTER_API_KEYS env var)

### API Endpoints

#### Item Management (requires x-api-key header)
- `POST /namespaces/{namespace}/match` - Match item to requestor (idempotent)
- `GET /namespaces/{namespace}/items` - List items with optional filtering
- `GET /namespaces/{namespace}/stats` - Get namespace statistics
- `PATCH /namespaces/{namespace}/items` - Batch add/remove items
- `PUT /namespaces/{namespace}/items` - Synchronize items in namespace

#### Admin (requires x-master-api-key header)
- `POST /admin/api-keys` - Create API key
- `DELETE /admin/api-keys/{apiKey}` - Delete API key
- `GET /admin/api-keys` - List API keys

### Key Implementation Details

- All operations are idempotent where appropriate
- Soft deletion prevents breaking references
- Proper error handling with meaningful messages
- OpenAPI documentation at /swagger
- Environment-based configuration for flexibility