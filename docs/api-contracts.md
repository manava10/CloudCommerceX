# API Contracts & Service Map

## Gateway Routing

All client requests go through the gateway. The gateway strips `/api/<service>` and forwards to the target service.

| Client path | Gateway forwards to | Service | Service path |
|-------------|---------------------|---------|--------------|
| `/api/auth/*` | auth:4001 | Auth | `/*` |
| `/api/catalog/*` | catalog:4002 | Catalog | `/*` |
| `/api/cart/*` | cart:4003 | Cart | `/*` |
| `/api/order/*` | order:4004 | Order | `/*` |
| `/api/payment/*` | payment:4005 | Payment | `/*` |
| `/api/notification/*` | notification:4006 | Notification | `/*` |

---

## Auth Service (port 4001)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create user. Body: `{ email, password }` |
| POST | `/login` | Login. Body: `{ email, password }`. Returns `{ token, user }` |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** PostgreSQL `users` table (when DATABASE_URL set)

---

## Catalog Service (port 4002)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List all products |
| GET | `/products/:id` | Get product by id |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** In-memory (hardcoded products)

---

## Cart Service (port 4003)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cart/:userId` | Get cart for user |
| POST | `/cart/:userId/items` | Add item. Body: `{ productId, qty, price }` |
| DELETE | `/cart/:userId/items/:productId` | Remove item |
| DELETE | `/cart/:userId` | Clear cart |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** PostgreSQL `cart_items` table (when DATABASE_URL set)

---

## Order Service (port 4004)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List orders. Query: `?userId=u1` to filter by user |
| POST | `/orders` | Create order. Body: `{ userId, items: [{ productId, qty, price }] }` |
| PATCH | `/orders/:id/status` | Update status. Body: `{ status }` (e.g. PAID) |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** PostgreSQL `orders`, `order_items` (when DATABASE_URL set)

**Events:** Publishes `order.created`, subscribes to `payment.completed` (updates status to PAID)

---

## Payment Service (port 4005)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/payments` | List payments |
| POST | `/payments` | Process payment. Body: `{ orderId, amount }` |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** In-memory

**Events:** Publishes `payment.completed`

---

## Notification Service (port 4006)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List notifications (from events) |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** In-memory (populated from `order.created`, `payment.completed` events)

**Events:** Subscribes to `order.created`, `payment.completed`

---

## Frontend API Paths (via gateway at /api)

```
/api/auth/register      POST
/api/auth/login         POST
/api/catalog/products   GET
/api/catalog/products/:id  GET
/api/cart/cart/:userId  GET, DELETE
/api/cart/cart/:userId/items  POST
/api/cart/cart/:userId/items/:productId  DELETE
/api/order/orders       GET (?userId=), POST
/api/order/orders/:id/status  PATCH
/api/payment/payments   GET, POST
/api/notification/notifications  GET
```
