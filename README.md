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

## API Endpoints

### Item Management

#### Match Item to Requestor

```
POST /namespaces/{namespace}/match
Headers: x-api-key: <your-api-key>
Body: { "requestor": "user123" }
```

Returns the first available item for the requestor. If the requestor has already been matched, returns the same item.

#### Get Items

```
GET /namespaces/{namespace}/items?item=<item>&requestor=<requestor>
Headers: x-api-key: <your-api-key>
```

Retrieve items in a namespace with optional filtering.

#### Get Statistics

```
GET /namespaces/{namespace}/stats
Headers: x-api-key: <your-api-key>
```

Returns total, matched, and available item counts.

#### Batch Add/Remove Items

```
PATCH /namespaces/{namespace}/items
Headers: x-api-key: <your-api-key>
Body: { "add": ["item1", "item2"], "remove": ["item3"] }
```

#### Synchronize Items

```
PUT /namespaces/{namespace}/items
Headers: x-api-key: <your-api-key>
Body: { "items": ["item1", "item2", "item3"] }
```

Ensures the namespace contains exactly the specified items.

### Admin API Key Management

#### Create API Key

```
POST /admin/api-keys
Headers: x-master-api-key: <master-key>
Body: { "apiKey": "new-key", "namespace": "my-namespace" }
```

#### Delete API Key

```
DELETE /admin/api-keys/{apiKey}
Headers: x-master-api-key: <master-key>
```

#### List API Keys

```
GET /admin/api-keys
Headers: x-master-api-key: <master-key>
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
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate migration files
- `bun run db:migrate`: Apply migrations
