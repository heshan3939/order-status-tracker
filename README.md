# Order Status Tracker

A small service that receives order status webhooks from a payment provider, stores
each order's state in MySQL, and shows the orders in a React dashboard. Built as a
practical task for the AETURNS internship.

## What it does

- `POST /webhooks/orders` receives events and updates order state.
- `GET /orders` lists orders, with an optional `?status=` filter.
- `GET /orders/:id` returns one order with its full event history.
- A React page lists the orders, filters them by status, and shows an order's event
  history when you click it, with loading, empty and error states.

## Tech stack

- Backend: Node.js, TypeScript, Express, zod (validation), mysql2
- Database: MySQL (developed and tested against XAMPP's MariaDB, which is MySQL-compatible)
- Frontend: React, Vite, TypeScript
- Tests: Vitest and Supertest

## Prerequisites

- Node.js 20 or newer
- MySQL 8 or MariaDB running locally on port 3306
- Two empty databases: `orders_app` (the app) and `orders_test` (the tests)

## Getting started

1. Start MySQL (for XAMPP, press Start next to MySQL in the control panel) and create
   the databases:

```sql
   CREATE DATABASE orders_app;
   CREATE DATABASE orders_test;
```

2. Install dependencies for both projects:

```
   npm run install:all
```

3. Create the backend env file and fill in your database details:

```
   cp backend/.env.example backend/.env
```

   On Windows PowerShell use `Copy-Item backend\.env.example backend\.env`. The XAMPP
   defaults are `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER=root`, an empty
   `DB_PASSWORD`, `DB_NAME=orders_app` and `DB_NAME_TEST=orders_test`.

4. Create the tables:

```
   cd backend
   npm run migrate
   cd ..
```

## Running it

Use two terminals:

```
npm run dev:backend      # API on http://localhost:3000
npm run dev:frontend     # dashboard on http://localhost:5173
```

To fill the dashboard with demo data (the backend must be running):

```
cd backend
npm run seed
```

The seed script sends a normal order flow, a duplicate event, an out-of-order order, an
order cancelled after payment, and an invalid cancel-after-shipped, and prints the HTTP
status of each.

## Running the tests

```
npm test
```

This needs MySQL running and the `orders_test` database created. The tests apply the
schema to `orders_test` themselves, clear it before each test, and never touch
`orders_app`. Test files run one at a time because they share one database.

## API

| Endpoint | Purpose | Responses |
| --- | --- | --- |
| `POST /webhooks/orders` | Receive an event `{ eventId, orderId, status, timestamp }` | 201 accepted, 200 duplicate, 400 invalid body, 409 invalid transition |
| `GET /orders` | List orders, optional `?status=paid` | 200, 400 for an unknown status |
| `GET /orders/:id` | One order with its event history, oldest first | 200, 404 if unknown |

Valid statuses are `created`, `paid`, `shipped`, `delivered` and `cancelled`.

## Key decisions

**Duplicates.** Every event has a unique `eventId`, which is the primary key of the
events table. If an event id has been seen before, the service returns 200 and changes
nothing. I chose 200 rather than an error because a duplicate is a normal retry from the
provider, and treating it as success stops the provider from retrying forever. The check
happens inside the same database transaction as the write, and a duplicate-key error
from the database is also treated as a duplicate, so two identical events arriving at
the same moment still result in one stored event.

**Out-of-order events.** The service never trusts arrival order. Every accepted event is
stored, and an order's current status is worked out from its full history sorted by the
event timestamp (ties are broken by status rank). When a new event arrives it is added
to the sorted history and the whole timeline is checked again. So if `shipped`, `paid`
and `created` arrive in that order but carry the right timestamps, the order still ends
up `shipped` and the history reads created, paid, shipped.

**What counts as an invalid transition.** A timeline is valid if its statuses only move
forward through created, paid, shipped, delivered. `cancelled` is only allowed after
`created` or `paid`, and nothing is allowed after `cancelled` or `delivered`. A second
event with a status the order already reached (a different `eventId` but another
`paid`, for example) is rejected too. Invalid events get a 409, are logged with
`console.warn`, and are not stored, so the order stays unchanged.

**Skipping ahead is allowed.** Going straight from `created` to `shipped` is accepted.
Because events can be late or out of order, a missing `paid` event is more likely to be
delayed than wrong. The alternative is strict step-by-step transitions with buffering of
early events, which is more precise but more complex. I kept the simpler rule and
documented it here.

**Transaction and locking.** Processing an event runs in one transaction. It makes sure
the order row exists, then locks that row with `SELECT ... FOR UPDATE`, so two events for
the same order can't be processed at the same time and validate against stale history.

**Timestamps.** Times are stored in UTC and compared as real dates, not strings.

**Business logic is separate from HTTP and the database.** The status rules are pure
functions in `backend/src/domain`, so they can be tested without a database. The routes
only validate input and translate the result of `processEvent` into an HTTP status.

**Frontend.** The list and detail views share a small fetch hook that uses an
`AbortController`, so a slow response from an old filter can't overwrite a newer one.
The selected order is plain component state, since a router wasn't needed.

**Why MySQL.** I'm comfortable with it and had it available locally. SQLite would be
easier for a reviewer to run, so the trade-off is documented in the setup section.

## Project structure

```
backend/
  src/domain/      status rules (pure functions)
  src/db/          schema.sql, migrate script, order service (transaction logic)
  src/routes/      HTTP routes
  src/app.ts       Express app
  src/server.ts    server entry point
  scripts/seed.ts  demo data
  tests/           API tests
frontend/
  src/             React app (api client, fetch hook, list and detail views)
AGENTS.md          instructions given to the AI coding agent
AI_NOTES.md        how AI tools were used
```

## What I skipped

- Verifying the webhook signature. A real payment provider signs its requests, and the
  endpoint should reject unsigned ones.
- Pagination on `GET /orders`.
- Frontend tests. I put the testing effort into the backend logic, which is the most
  likely place for bugs.
- Styling, since the brief says it isn't assessed.
- A Docker setup for the database. I didn't have Docker installed.

## What I'd do with more time

- Add webhook signature verification and basic authentication for the dashboard.
- Store rejected events in their own table so they can be inspected, not only logged.
- Add pagination and search to the order list.
- Add a `docker-compose.yml` so the database starts with one command.
- Add frontend tests and run the tests in CI.

## Time spent

around 3 hours

## AI usage

See `AI_NOTES.md` for the tools I used, one place the AI got something wrong, and what I
wrote myself. The agent instructions are in `AGENTS.md`.