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
| POST | `/register-seller` | Create seller account. Body: `{ email, password, storeName }`. Returns `{ token, user: { id, email, role, sellerId, storeName } }` |
| POST | `/login` | Login. Body: `{ email, password }`. Returns `{ token, user }` |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** PostgreSQL `users` table (when DATABASE_URL set)

---

## Catalog Service (port 4002)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List all products |
| GET | `/products?sellerId=s1` | List products for one seller |
| GET | `/products/:id` | Get product by id |
| POST | `/products` | Seller creates product. Body: `{ name, price, stock, image, description }` |
| GET | `/sellers/:sellerId/products` | List products owned by a seller |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** PostgreSQL `products` table when `DATABASE_URL` is set; otherwise in-memory fallback.

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
| GET | `/sellers/:sellerId/orders` | Seller view of incoming orders and payment status |
| PATCH | `/sellers/:sellerId/orders/:orderId/items/:productId/tracking` | Seller updates fulfillment status, courier, tracking ID, and estimated delivery date |
| POST | `/orders` | Create order. Body: `{ userId, items: [{ productId, qty, price }] }` |
| PATCH | `/orders/:id/cancel` | Customer cancels their own order before delivery |
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
| GET | `/notifications` | List notifications. Query: `?userId=u1` to filter by user |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

**Data:** In-memory (populated from `order.created`, `payment.completed` events)

**Events:** Subscribes to `order.created`, `payment.completed`

---

## Frontend API Paths (via gateway at /api)

```
/api/auth/register      POST
/api/auth/register-seller  POST
/api/auth/login         POST
/api/catalog/products   GET
/api/catalog/products?sellerId=s1  GET
/api/catalog/products   POST (seller only)
/api/catalog/sellers/:sellerId/products  GET
/api/catalog/products/:id  GET
/api/cart/cart/:userId  GET, DELETE
/api/cart/cart/:userId/items  POST
/api/cart/cart/:userId/items/:productId  DELETE
/api/order/orders       GET (?userId=), POST
/api/order/sellers/:sellerId/orders  GET
/api/order/sellers/:sellerId/orders/:orderId/items/:productId/tracking  PATCH
/api/order/orders/:id/cancel  PATCH
/api/order/orders/:id/status  PATCH
/api/payment/payments   GET, POST
/api/notification/notifications  GET
```
