# Review-1 Report

## Review Focus

Problem statement validation, architecture finalization, and full e-commerce implementation.

## Completed Modules

- **Auth service** (`services/auth`) — Register, login, JWT, PostgreSQL
- **Catalog service** (`services/catalog`) — Product listing, in-memory
- **Cart service** (`services/cart`) — Add/remove items, PostgreSQL
- **Order service** (`services/order`) — Create orders, PostgreSQL, publishes `order.created`
- **Payment service** (`services/payment`) — Mock payment, publishes `payment.completed`
- **Notification service** (`services/notification`) — Consumes events, in-memory
- **API gateway** (`services/gateway`) — Routing, JWT validation, static frontend
- **React frontend** (`frontend-react`) — Browse, login, cart, checkout, orders, notifications

## Evidence

- Health and metrics endpoints in all services
- Auth: register, login with JWT
- Catalog: list products, product detail
- Cart: get, add, remove, clear (JWT required)
- Order: create, list, status update (JWT required)
- Payment: mock process (JWT required)
- Notification: list (JWT required)
- Gateway: routes `/api/*`, validates JWT for protected routes
- Frontend: React SPA with protected routes, loading states, toast notifications

## Architecture

- Single gateway entry point
- 6 backend services (auth, catalog, cart, order, payment, notification)
- PostgreSQL for users, cart_items, orders, order_items
- RabbitMQ for `order.created` and `payment.completed` events

## API Documentation

See:
- `docs/api-contracts.md`
- `docs/reports/review-1-detailed-system-report.md` (full technical report)

## Testing Evidence

- `tests/auth-catalog.test.js`
- `tests/cart-order.test.js`
- Requires `DATABASE_URL` and running services

## Issues Faced and Solutions

- Gateway downstream errors → 502 handling
- JWT mismatch → Fixed gateway `.env` path to load `JWT_SECRET`
- Notifications not showing → Added dotenv to notification/payment; require `RABBITMQ_URL`
- Login redirect → Gateway was not loading root `.env`

## Next Phase Plan

- Docker Compose deployment
- Monitoring (Prometheus, Grafana)
- Additional integration tests
