# CloudCommercX

CloudCommercX is a learning-focused SDP project that demonstrates an advanced e-commerce application using microservices, Docker-based deployment, and review-ready documentation.

## Services

- `gateway` - entry point and route forwarding
- `auth` - user registration and login (JWT)
- `catalog` - product listing and lookup
- `cart` - in-memory cart operations
- `order` - order placement and event publishing
- `payment` - mock payment processing
- `notification` - consumes events for user notifications
- `frontend-react` - React e-commerce UI (browse without login, signup to purchase)

## Quick Start

1. Install dependencies:
   - `npm install`
2. (Optional) PostgreSQL: copy `.env.example` to `.env`, set `DATABASE_URL`, then:
   - `npm run migrate`
3. Run tests:
   - `npm test`
3. Run all local services with one command:
   - `npm run start:all`
4. Start full stack with Docker:
   - `docker compose up --build`
5. Open app:
   - **Dev**: `cd frontend-react && npm install && npm run dev` then open `http://localhost:5173`
   - **Prod**: `npm run build:frontend` then `npm run start:all` → `http://localhost:3000`

## Docs

- Scope and milestones: `docs/scope.md`
- Architecture and data ownership: `docs/architecture.md`
- API contracts: `docs/api-contracts.md`
- Review/report templates: `docs/reports/`
