# Project rules
- Order Status Tracker: Node + TypeScript backend (Express, mysql2), React + Vite frontend.
- Status rules live in backend/src/domain and must stay pure: no DB, no HTTP.
- Sort an order's events by their timestamp, never by arrival order.
- Duplicate eventIds are ignored idempotently (HTTP 200, no state change).
- Invalid transitions return 409 and are logged with console.warn.
- Never run git commands. I commit manually.
- Never commit secrets. Use .env.example.
- Keep code simple. Add comments where logic is non-obvious. Avoid extra libraries.
