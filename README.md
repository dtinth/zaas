# zaas (Zipper-as-a-Service)

A simple microservice that matches predefined items with requestors. Perfect for distributing promotional codes, vouchers, or any finite resources in a stateless, idempotent manner.

## Overview

zaas implements a "zipper" concept where:

- **Items** are predefined resources available to be claimed (e.g., promotional codes)
- **Requestors** are identifiers for entities requesting items (e.g., user IDs)
- The system matches available items with requestors ensuring idempotency

## Features

- **Multi-tenant**: Support for multiple namespaces
- **Idempotent**: Same requestor always gets the same item
- **Stateless**: No session management required
- **RESTful API**: Clean HTTP endpoints with OpenAPI documentation
- **Soft deletion**: Items can be safely removed without breaking references

## Quick Start

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database**:

   ```bash
   bun run db:push
   ```

4. **Start development server**:

   ```bash
   bun run dev
   ```

5. **View API documentation**:
   Open http://localhost:32700/swagger

## Docker Deployment

### Using Docker Compose (Portainer)

Create a `docker-compose.yml` file:

```yaml
services:
  dashboard:
    image: ghcr.io/dtinth/zaas:latest
    restart: unless-stopped
    env_file: stack.env
    ports:
      - 127.0.0.1:32700:32700
    volumes:
      - data:/data
volumes:
  data:
```

### Deployment Steps

1. **Prepare environment file**:

   ```bash
   cp .env.example stack.env
   # Edit stack.env with your configuration
   ```

2. **Deploy with Docker Compose**:

   ```bash
   docker-compose up -d
   ```

3. **Access the service**:
   - API: http://localhost:32700
   - Documentation: http://localhost:32700/swagger

## API Endpoints

### Variables for VS Code REST Extension

Create a `.env` file in your project root for VS Code REST Extension:

```env
ZAAS_URL=http://localhost:32700
ZAAS_API_KEY=your-api-key-here
ZAAS_MASTER_API_KEY=your-master-key-here
```

```http
@baseUrl = {{$dotenv ZAAS_URL}}
@apiKey = {{$dotenv ZAAS_API_KEY}}
@masterApiKey = {{$dotenv ZAAS_MASTER_API_KEY}}
```

### Item Management

#### Match Item to Requestor

```http
POST {{baseUrl}}/namespaces/my-namespace/match
Content-Type: application/json
x-api-key: {{apiKey}}

{
  "requestor": "user123"
}
```

Returns the first available item for the requestor. If the requestor has already been matched, returns the same item.

#### Get Items

```http
GET {{baseUrl}}/namespaces/my-namespace/items?item=promo-code-1&requestor=user123
x-api-key: {{apiKey}}
```

Retrieve items in a namespace with optional filtering.

#### Get Statistics

```http
GET {{baseUrl}}/namespaces/my-namespace/stats
x-api-key: {{apiKey}}
```

Returns total, matched, and available item counts.

#### Batch Add/Remove Items

```http
PATCH {{baseUrl}}/namespaces/my-namespace/items
Content-Type: application/json
x-api-key: {{apiKey}}

{
  "add": ["item1", "item2"],
  "remove": ["item3"]
}
```

#### Synchronize Items

```http
PUT {{baseUrl}}/namespaces/my-namespace/items
Content-Type: application/json
x-api-key: {{apiKey}}

{
  "items": ["item1", "item2", "item3"]
}
```

Ensures the namespace contains exactly the specified items.

### Admin API Key Management

#### Create API Key

```http
POST {{baseUrl}}/admin/api-keys
Content-Type: application/json
x-master-api-key: {{masterApiKey}}

{
  "apiKey": "new-key",
  "namespace": "my-namespace"
}
```

#### Delete API Key

```http
DELETE {{baseUrl}}/admin/api-keys/new-key
x-master-api-key: {{masterApiKey}}
```

#### List API Keys

```http
GET {{baseUrl}}/admin/api-keys
x-master-api-key: {{masterApiKey}}
```

## Configuration

Environment variables:

- `DATABASE_URL`: SQLite database file path (default: `file:local.db`)
- `MASTER_API_KEYS`: Comma-separated list of master API keys for admin operations
- `PORT`: Server port (default: 32700)

## Example Use Case

Distributing promotional codes:

1. Create API key for your application
2. Add promotional codes to a namespace
3. When users complete challenges, call the match endpoint
4. Users receive unique codes, with idempotency ensuring no duplicates

## Database Schema

- **items**: Stores items with their namespace, requestor assignments, and timestamps
- **api_keys**: Manages API keys with namespace access control

## Development Commands

- `bun run dev`: Start development server with hot reload
- `bun run start`: Start production server
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate migration files
- `bun run db:migrate`: Apply migrations
