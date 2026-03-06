# CloudCommercX — Complete Technical Report (Review-1)

**Purpose:** Exhaustive documentation of every component, service, API, database, and flow for Review-1 presentation and explanation.

---

# Part 1: Project Overview

## 1.1 Problem Statement

Traditional monolithic e-commerce applications become hard to maintain when features grow. A microservices approach allows each business capability to evolve independently, improves modularity, and supports clearer ownership of data and APIs. CloudCommercX is designed as an educational production-style system.

## 1.2 Scope

| Feature | Status |
|---------|--------|
| User registration | ✅ |
| User login with JWT | ✅ |
| Product catalog browse | ✅ |
| Add/remove cart items | ✅ |
| Place orders | ✅ |
| Mock payment | ✅ |
| Event-driven notifications | ✅ |
| Protected routes | ✅ |
| Loading states | ✅ |
| Toast notifications | ✅ |

## 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 7 |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL (Aiven or local) |
| Message broker | RabbitMQ |
| Auth | JWT (jsonwebtoken) |
| Styling | Tailwind CSS |
| Metrics | Prometheus (prom-client) |

---

# Part 2: Architecture

## 2.1 System Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (User)                                           │
│  Dev: http://localhost:5173 (Vite)  |  Prod: http://localhost:3000 (Gateway)       │
└──────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ All /api/* requests
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY — localhost:3000                                    │
│  • Single entry point                                                             │
│  • Strips /api/<service> and forwards to internal service                         │
│  • JWT validation for cart, order, payment, notification                         │
│  • Serves React build (SPA) for non-API routes                                    │
│  • 502 on downstream failure                                                      │
└──────────────────────────────────────────────────────────────────────────────────┘
     │         │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
│ Auth   │ │Catalog │ │  Cart  │ │ Order  │ │Payment │ │Notification│
│ :4001  │ │ :4002  │ │ :4003  │ │ :4004  │ │ :4005  │ │   :4006    │
│ PUBLIC │ │ PUBLIC │ │  JWT   │ │  JWT   │ │  JWT   │ │    JWT     │
└───┬────┘ └────────┘ └───┬────┘ └───┬────┘ └───┬────┘ └─────┬──────┘
    │                      │          │          │             │
    ▼                      ▼          ▼          │             │
┌─────────┐          ┌─────────┐  ┌─────────┐   │             │
│PostgreSQL│          │PostgreSQL│  │RabbitMQ │   └─────────────┘
│  users  │          │cart_items│  │Exchange │   order.created
└─────────┘          └─────────┘  │topic    │   payment.completed
    │                      │       └─────────┘
    │                      │
    └──────────────────────┴─────── PostgreSQL: orders, order_items
```

## 2.2 Service Ports

| Service | Port | Auth Required |
|---------|------|---------------|
| Gateway | 3000 | — |
| Auth | 4001 | No |
| Catalog | 4002 | No |
| Cart | 4003 | Yes (JWT) |
| Order | 4004 | Yes (JWT) |
| Payment | 4005 | Yes (JWT) |
| Notification | 4006 | Yes (JWT) |

## 2.3 File Structure

```
CloudCommercX/
├── .env                    # Secrets (not committed)
├── .env.example            # Template
├── package.json            # Root scripts, workspaces
├── scripts/
│   ├── migrate.js          # DB schema creation
│   └── run-all-local.sh    # Start all 7 services
├── services/
│   ├── common/
│   │   ├── db.js           # PostgreSQL pool
│   │   └── eventBus.js     # RabbitMQ publish/subscribe
│   ├── auth/src/index.js
│   ├── catalog/src/index.js
│   ├── cart/src/index.js
│   ├── order/src/index.js
│   ├── payment/src/index.js
│   ├── notification/src/index.js
│   └── gateway/src/index.js
├── frontend-react/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── lib/api.js
│   │   ├── context/ToastContext.jsx
│   │   ├── components/
│   │   └── pages/
│   └── vite.config.js
└── tests/
    ├── auth-catalog.test.js
    └── cart-order.test.js
```

---

# Part 3: Backend Services (Exhaustive)

## 3.1 API Gateway (`services/gateway/src/index.js`)

### Purpose
Single entry point for all client requests. Routes to internal services, validates JWT for protected routes, serves React SPA.

### Configuration
- **Port:** 3000 (or `PORT`)
- **JWT Secret:** `JWT_SECRET` (must match Auth)
- **Service URLs:** `AUTH_URL`, `CATALOG_URL`, etc. (default localhost:4001–4006)

### Routing Logic

| Client Path | Strip Prefix | Forward To | Auth |
|-------------|---------------|------------|------|
| `/api/auth/*` | `/api/auth` | `AUTH_URL` + suffix | No |
| `/api/catalog/*` | `/api/catalog` | `CATALOG_URL` + suffix | No |
| `/api/cart/*` | `/api/cart` | `CART_URL` + suffix | **Yes** |
| `/api/order/*` | `/api/order` | `ORDER_URL` + suffix | **Yes** |
| `/api/payment/*` | `/api/payment` | `PAYMENT_URL` + suffix | **Yes** |
| `/api/notification/*` | `/api/notification` | `NOTIFICATION_URL` + suffix | **Yes** |

### Path Transformation Example
- Client: `GET /api/cart/cart/u1`
- Strip `/api/cart` → suffix = `/cart/u1`
- Forward: `GET http://localhost:4003/cart/u1`

### JWT Validation (`requireAuth`)
1. Read `Authorization` header
2. Extract token after `Bearer `
3. `jwt.verify(token, jwtSecret)` → decode
4. Set `req.user = { id: decoded.sub }`
5. On failure → 401 `{ error: "unauthorized" }` or `{ error: "invalid or expired token" }`

### Static Files
- Serves `frontend-react/dist` for SPA
- Fallback: `index.html` for client-side routing
- If build missing: HTML message "Run npm run build:frontend"

---

## 3.2 Auth Service (`services/auth/src/index.js`)

### Purpose
User registration, login, JWT issuance.

### Data Source
- **With DATABASE_URL:** PostgreSQL `users` table
- **Without:** In-memory array `users`

### Password Hashing
```javascript
crypto.createHash("sha256").update(password).digest("hex")
```
(SHA-256 for demo; production should use bcrypt.)

### Endpoints

#### POST `/register`
**Request:**
```json
{ "email": "user@example.com", "password": "secret123" }
```
**Success (201):**
```json
{ "id": "u1", "email": "user@example.com" }
```
**Errors:**
- 400: missing email/password
- 409: user already exists
- 500: DB error

**Logic (DB):**
1. Check `SELECT id FROM users WHERE email = $1`
2. If exists → 409
3. Insert `(email, password_hash)` → return `u${id}`

#### POST `/login`
**Request:**
```json
{ "email": "user@example.com", "password": "secret123" }
```
**Success (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "u1", "email": "user@example.com" }
}
```
**Errors:**
- 401: invalid credentials
- 500: DB error

**Logic (DB):**
1. `SELECT id, email, password_hash FROM users WHERE email = $1`
2. Compare `password_hash === hashPassword(password)`
3. `jwt.sign({ sub: "u${id}", email }, jwtSecret, { expiresIn: "1h" })`

### User ID Format
- DB: integer `1`, `2`, ...
- API: string `"u1"`, `"u2"`, ...

---

## 3.3 Catalog Service (`services/catalog/src/index.js`)

### Purpose
Product listing and detail. No database; hardcoded products.

### Products (6 items)
| id | name | price | stock |
|----|------|-------|-------|
| p1 | Mechanical Keyboard | 3499 | 30 |
| p2 | Wireless Mouse | 1799 | 50 |
| p3 | USB-C Hub | 2299 | 20 |
| p4 | Monitor Stand | 2499 | 25 |
| p5 | Webcam HD | 4299 | 15 |
| p6 | Desk Lamp | 1299 | 40 |

Each has `image` URL (Unsplash).

### Endpoints

#### GET `/products`
**Response (200):** Array of `{ id, name, price, stock, image }`

#### GET `/products/:id`
**Response (200):** Single product  
**Response (404):** `{ error: "product not found" }`

---

## 3.4 Cart Service (`services/cart/src/index.js`)

### Purpose
User cart: add, remove, list, clear. Keyed by `userId`.

### Data Source
- **With DATABASE_URL:** PostgreSQL `cart_items`
- **Without:** In-memory `Map` keyed by userId

### Endpoints

#### GET `/cart/:userId`
**Response (200):**
```json
{
  "userId": "u1",
  "items": [
    { "productId": "p1", "qty": 2, "price": 3499 }
  ]
}
```

#### POST `/cart/:userId/items`
**Request:**
```json
{ "productId": "p1", "qty": 1, "price": 3499 }
```
**Logic (DB):** `INSERT ... ON CONFLICT (user_id, product_id) DO UPDATE SET qty = cart_items.qty + EXCLUDED.qty`  
**Response (201):** `{ userId, items }`

#### DELETE `/cart/:userId/items/:productId`
**Response (200):** `{ userId, items }` (updated list)

#### DELETE `/cart/:userId`
**Response (204):** Empty (cart cleared)

---

## 3.5 Order Service (`services/order/src/index.js`)

### Purpose
Create orders, list by user, update status. Publishes `order.created`, subscribes to `payment.completed`.

### Data Source
- **With DATABASE_URL:** PostgreSQL `orders`, `order_items`
- **Without:** In-memory `orders` array

### Order ID Format
- DB: integer `1`, `2`, ...
- API: string `"o1"`, `"o2"`, ...

### Endpoints

#### GET `/orders`
**Query:** `?userId=u1` (optional)  
**Response (200):** Array of:
```json
{
  "id": "o1",
  "userId": "u1",
  "items": [{ "productId": "p1", "qty": 2, "price": 3499 }],
  "total": 6998,
  "status": "CREATED",
  "createdAt": "2025-02-26T..."
}
```

#### POST `/orders`
**Request:**
```json
{
  "userId": "u1",
  "items": [
    { "productId": "p1", "qty": 2, "price": 3499 }
  ]
}
```
**Logic:**
1. Compute `total = sum(price * qty)`
2. Insert `orders` row
3. Insert `order_items` rows
4. `publish("order.created", order)`
5. Return 201 with order

#### PATCH `/orders/:id/status`
**Request:** `{ "status": "PAID" }`  
**Logic:** `UPDATE orders SET status = $1 WHERE id = $2`

### Event: `payment.completed` Listener
- Subscribes on startup (if RabbitMQ available)
- On message: `UPDATE orders SET status = 'PAID' WHERE id = orderId`

---

## 3.6 Payment Service (`services/payment/src/index.js`)

### Purpose
Mock payment. Always succeeds. Publishes `payment.completed`.

### Data
In-memory `payments` array.

### Endpoints

#### POST `/payments`
**Request:**
```json
{ "orderId": "o1", "amount": 6998 }
```
**Logic:**
1. Create `{ id, orderId, amount, status: "SUCCESS", processedAt }`
2. `publish("payment.completed", payment)`
3. Return 201

---

## 3.7 Notification Service (`services/notification/src/index.js`)

### Purpose
Consume `order.created` and `payment.completed`, store notifications, serve list.

### Data
In-memory `notifications` array. Each: `{ id, type, payload, createdAt }`.

### Event Consumers
- `order.created` → `addNotification("ORDER_CREATED", payload)`
- `payment.completed` → `addNotification("PAYMENT_COMPLETED", payload)`

### Endpoints

#### GET `/notifications`
**Response (200):** Array of notifications (JWT required via gateway)

---

## 3.8 Event Bus (`services/common/eventBus.js`)

### Purpose
RabbitMQ publish/subscribe. Used by Order, Payment, Notification.

### Configuration
- **Env:** `RABBITMQ_URL` (e.g. `amqp://localhost:5672`)
- **Exchange:** `cloudcommercx.events` (topic)
- **If no RABBITMQ_URL:** `getChannel()` returns null; publish/subscribe no-op

### API
- `publish(topic, payload)` — JSON-serializes payload
- `subscribe(topic, onMessage)` — Creates exclusive queue, binds, consumes

### Events
| Topic | Publisher | Payload |
|-------|-----------|---------|
| order.created | Order | `{ id, userId, items, total, status, createdAt }` |
| payment.completed | Payment | `{ id, orderId, amount, status, processedAt }` |

---

## 3.9 Database Module (`services/common/db.js`)

### Purpose
PostgreSQL connection pool. Used by Auth, Cart, Order.

### Configuration
- `DATABASE_URL` or `PGHOST`, `PGUSER`, etc.
- For Aiven: sets `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only)

### API
- `query(text, params)` — Execute SQL, return result

---

# Part 4: Database Schema

## 4.1 Migration (`scripts/migrate.js`)

Run: `npm run migrate`

### Tables

#### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### orders
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | VARCHAR(50) | NOT NULL |
| total | INTEGER | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'CREATED' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

#### order_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| order_id | INTEGER | FK → orders(id) ON DELETE CASCADE |
| product_id | VARCHAR(50) | NOT NULL |
| qty | INTEGER | NOT NULL |
| price | INTEGER | NOT NULL |

#### cart_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | VARCHAR(50) | NOT NULL |
| product_id | VARCHAR(50) | NOT NULL |
| qty | INTEGER | NOT NULL |
| price | INTEGER | NOT NULL |
| UNIQUE(user_id, product_id) | | |

---

# Part 5: Frontend (Exhaustive)

## 5.1 Entry Point

### `main.jsx`
- Renders `<App />` into `#root`
- Imports `index.css`

### `App.jsx` — Root Component

**Structure:**
```
ToastProvider
  └── AppContent (BrowserRouter)
        ├── Header
        ├── Routes (HomePage, OrdersPage, CheckoutPage, OrderConfirmationPage)
        ├── AuthModal
        └── CartDrawer
```

**State:**
| State | Type | Purpose |
|-------|------|---------|
| user | object \| null | `{ id, email, token }` from localStorage |
| products | array | From catalog API |
| productsLoading | boolean | Catalog fetch |
| cart | array | Cart items |
| cartLoading | boolean | Cart fetch |
| showAuth | boolean | Auth modal visibility |
| showCart | boolean | Cart drawer visibility |
| authMode | 'login' \| 'signup' | Auth modal mode |

**Effects:**
1. Listen `auth:logout` → `setUser(null)`
2. On user change → sync localStorage
3. On mount → fetch products
4. On user → fetch cart

**Handlers:**
- `addToCart(product)` — If !user → open auth; else POST cart, refresh
- `removeFromCart(productId)` — DELETE cart item, refresh
- `onAuthSuccess(userData)` — setUser, close auth, refresh cart

---

## 5.2 API Client (`lib/api.js`)

### `getAuthHeader()`
- Reads `localStorage.cloudcommercx_user`
- Returns `{ Authorization: "Bearer <token>" }` if token exists

### `api(path, options)`
- Base: `/api` (relative; Vite proxies to gateway)
- Merges `Content-Type`, `getAuthHeader()`, `options.headers`
- On 401: clears localStorage, dispatches `auth:logout`
- Throws on !res.ok
- Returns parsed JSON

---

## 5.3 Toast Context (`context/ToastContext.jsx`)

- `ToastProvider` — wraps app, provides `toast(message, type)`
- `useToast()` — returns toast function
- Toasts auto-dismiss after 4s
- Types: `'info'` (default), `'error'` (red styling)

---

## 5.4 Components (Detailed)

### Header
**Props:** `user`, `cartCount`, `onLogin`, `onSignup`, `onLogout`, `onCartClick`

**Renders:**
- Logo (Link to /)
- If user: email, NotificationsDropdown, My Orders link, cart button (with count), Logout
- If !user: Login, Sign up

### AuthModal
**Props:** `open`, `mode`, `onClose`, `onSuccess`, `onSwitchMode`

**State:** email, password, error, loading

**Flow:**
- mode=signup: POST /auth/register → toast → onSwitchMode (to login)
- mode=login: POST /auth/login → onSuccess({ id, email, token })

### CartDrawer
**Props:** `open`, `onClose`, `cart`, `cartLoading`, `products`, `user`, `onRemove`, `onLogin`

**Renders:**
- Overlay + panel
- If cartLoading: 3 skeleton rows
- If empty: "Your cart is empty"
- Else: list with image, name, qty×price, Remove button
- Total
- If user: Link "Proceed to Checkout"; else: button "Sign in to checkout"

### ProductGrid
**Props:** `products`, `loading`, `onAddToCart`

**If loading:** 8 skeleton cards (animate-pulse)  
**Else:** Grid of ProductCard

### ProductCard
**Props:** `product`, `onAddToCart`

**Renders:** Image, name, price (₹), "Add to cart" button

### Hero
Static hero section: "Tech that works", subtitle.

### NotificationsDropdown
**State:** open, notifications, loading, lastSeenCount (from localStorage)

**Logic:**
- Fetch on mount + every 30s
- When open: fetch, set lastSeenCount = list.length (mark as seen)
- Badge: `unreadCount = max(0, notifications.length - lastSeenCount)`

**Renders:** Bell icon, badge (if unreadCount>0), dropdown with list (max 10)

### ProtectedRoute
**Props:** `user`, `children`  
**If !user:** `<Navigate to="/" replace />`  
**Else:** render children

---

## 5.5 Pages (Detailed)

### HomePage
**Props:** products, productsLoading, onAddToCart  
**Renders:** Hero, "Shop" heading, ProductGrid

### CheckoutPage
**Props:** user, cart, products, onCartCleared

**State:** step (1|2), address, payment, error, loading

**Step 1 — Address:**
- Fields: name, line1, line2, city, state, zip, phone
- Validation: name, line1, city, phone required
- "Continue to Payment"

**Step 2 — Payment:**
- Card number (16 digits), MM/YY, CVV
- Validation: 16 digits, MM/YY format, 3–4 digit CVV
- "Pay ₹X" button

**Place Order Flow:**
1. POST /order/orders { userId, items, shippingAddress }
2. POST /payment/payments { orderId, amount }
3. PATCH /order/orders/:id/status { status: 'PAID' }
4. DELETE /cart/cart/:userId
5. onCartCleared()
6. navigate(`/order-confirmation/${orderId}`)

### OrdersPage
**Props:** user, products

**State:** orders, loading

**Effect:** Fetch `/order/orders?userId=...` on user change

**Renders:**
- Loading: 3 skeleton cards
- Empty: "No orders yet" + Start Shopping link
- List: Order cards with id, date, status, items, total

### OrderConfirmationPage
**Props:** user, products

**State:** order, loading

**Effect:** Fetch orders, find by orderId from URL params

**Renders:**
- Loading: "Loading..."
- !order: "Order not found"
- Success: Green checkmark, "Order Placed!", order details, View all orders / Continue shopping links

---

## 5.6 Vite Config

- Port: 5173
- Proxy: `/api` → `http://localhost:3000` (gateway)

---

# Part 6: Complete Request Flows

## 6.1 User Registration

```
1. User fills AuthModal (mode=signup), submits
2. api('/auth/register', { body: { email, password } })
3. Fetch: POST /api/auth/register → Gateway → Auth:4001/register
4. Auth: hash password, INSERT users, return { id, email }
5. Toast "Account created! Sign in below."
6. onSwitchMode() → mode=login
```

## 6.2 User Login

```
1. User fills AuthModal (mode=login), submits
2. api('/auth/login', { body: { email, password } })
3. Auth: verify, jwt.sign({ sub: "u1", email }, 1h)
4. Return { token, user: { id, email } }
5. onSuccess({ id, email, token }) → setUser, localStorage, close modal
6. Cart useEffect runs → GET /api/cart/cart/u1 (with Authorization header)
```

## 6.3 Add to Cart (Logged In)

```
1. User clicks "Add to cart" on ProductCard
2. addToCart(product) → api POST /api/cart/cart/u1/items { productId, qty: 1, price }
3. Gateway: requireAuth (JWT valid) → Cart:4003
4. Cart: INSERT/UPDATE cart_items
5. refreshCart() → GET cart → setCart
```

## 6.4 Add to Cart (Not Logged In)

```
1. addToCart() → if !user: setAuthMode('login'), setShowAuth(true)
2. User logs in → then can add
```

## 6.5 Place Order (Full Flow)

```
1. User on CheckoutPage, step 2, clicks "Pay ₹X"
2. handlePlaceOrder():
   a. POST /api/order/orders { userId, items, shippingAddress }
      → Order: insert orders+order_items, publish order.created
   b. POST /api/payment/payments { orderId, amount }
      → Payment: create, publish payment.completed
   c. PATCH /api/order/orders/o1/status { status: 'PAID' }
   d. DELETE /api/cart/cart/u1
   e. onCartCleared() → refreshCart
   f. navigate('/order-confirmation/o1')
3. RabbitMQ: order.created → Notification adds ORDER_CREATED
4. RabbitMQ: payment.completed → Notification adds PAYMENT_COMPLETED, Order updates status
```

## 6.6 401 Handling (Token Expired)

```
1. Any api() call returns 401
2. api.js: localStorage.removeItem('cloudcommercx_user')
3. api.js: window.dispatchEvent('auth:logout')
4. App: listener → setUser(null)
5. ProtectedRoute: user null → Navigate to /
```

---

# Part 7: Environment Variables

| Variable | Services | Description |
|----------|----------|--------------|
| DATABASE_URL | Auth, Cart, Order | PostgreSQL connection string |
| JWT_SECRET | Auth, Gateway | Must match; used for sign/verify |
| RABBITMQ_URL | Order, Payment, Notification | amqp://localhost:5672 |
| PORT | All | Override default port |
| AUTH_URL, CATALOG_URL, ... | Gateway | Service base URLs |
| NODE_TLS_REJECT_UNAUTHORIZED | db.js | 0 for Aiven self-signed (dev) |

---

# Part 8: Run Commands

| Command | Description |
|---------|-------------|
| npm run migrate | Create DB tables (once) |
| npm run start:all | Start auth, catalog, cart, order, payment, notification, gateway |
| npm run build:frontend | Build React → frontend-react/dist |
| cd frontend-react && npm run dev | Vite dev server :5173, proxy /api |

**Startup Order (run-all-local.sh):** auth, catalog, cart, order, payment, notification, gateway (parallel).

---

# Part 9: Tests

## auth-catalog.test.js
- Starts Auth and Catalog on random ports
- Registers user, logs in, asserts token
- Fetches products, asserts length > 0
- **Requires:** No DB (uses in-memory) for auth if no DATABASE_URL

## cart-order.test.js
- Starts Cart and Order on random ports
- Adds item to cart u1
- Creates order with cart items
- Asserts order status CREATED, total correct
- **Requires:** DATABASE_URL for persistence (or in-memory)

---

# Part 10: Key Implementation Details

1. **User ID:** Auth returns `u1`, `u2` (prefix + DB id). Used in cart path, order userId.
2. **Order ID:** Order returns `o1`, `o2`. Used in payment, status PATCH, confirmation URL.
3. **Cart path:** Client uses `/api/cart/cart/u1` because gateway strips `/api/cart`, Cart receives `/cart/u1`.
4. **JWT payload:** `{ sub: "u1", email }` — `sub` is user id for gateway's req.user.
5. **Notifications:** Require RabbitMQ. Badge = unread; opening dropdown marks as seen (localStorage).
6. **Checkout address:** Collected but not persisted (order service ignores shippingAddress in current impl).
7. **Payment:** Always succeeds. No real gateway.

---

# Part 11: Error Handling Summary

| Scenario | Handling |
|----------|----------|
| Downstream service down | Gateway 502 |
| Invalid/expired JWT | Gateway 401 |
| 401 from any API | Frontend: clear user, auth:logout, redirect |
| DB error | Service 500, generic message in production |
| RabbitMQ unavailable | Publish/subscribe no-op; notifications empty |
| Cart/order without JWT | Gateway 401 before forwarding |

---

# Part 12: Complete API Reference (Request/Response)

## Auth Service

### POST /register
```
Request:  { "email": "a@b.com", "password": "pass123" }
201:      { "id": "u1", "email": "a@b.com" }
400:      { "error": "email and password are required" }
409:      { "error": "user already exists" }
500:      { "error": "..." }
```

### POST /login
```
Request:  { "email": "a@b.com", "password": "pass123" }
200:      { "token": "eyJ...", "user": { "id": "u1", "email": "a@b.com" } }
401:      { "error": "invalid credentials" }
500:      { "error": "..." }
```

## Catalog Service

### GET /products
```
200:      [{ "id": "p1", "name": "Mechanical Keyboard", "price": 3499, "stock": 30, "image": "https://..." }, ...]
```

### GET /products/:id
```
200:      { "id": "p1", "name": "...", "price": 3499, "stock": 30, "image": "..." }
404:      { "error": "product not found" }
```

## Cart Service (JWT required)

### GET /cart/:userId
```
200:      { "userId": "u1", "items": [{ "productId": "p1", "qty": 2, "price": 3499 }] }
```

### POST /cart/:userId/items
```
Request:  { "productId": "p1", "qty": 1, "price": 3499 }
201:      { "userId": "u1", "items": [...] }
400:      { "error": "productId, qty, price are required" }
```

### DELETE /cart/:userId/items/:productId
```
200:      { "userId": "u1", "items": [...] }
```

### DELETE /cart/:userId
```
204:      (empty body)
```

## Order Service (JWT required)

### GET /orders?userId=u1
```
200:      [{ "id": "o1", "userId": "u1", "items": [...], "total": 6998, "status": "CREATED", "createdAt": "..." }]
```

### POST /orders
```
Request:  { "userId": "u1", "items": [{ "productId": "p1", "qty": 2, "price": 3499 }] }
201:      { "id": "o1", "userId": "u1", "items": [...], "total": 6998, "status": "CREATED", "createdAt": "..." }
400:      { "error": "userId and items are required" }
```

### PATCH /orders/:id/status
```
Request:  { "status": "PAID" }
200:      { "ok": true }
400:      { "error": "status required" }
```

## Payment Service (JWT required)

### POST /payments
```
Request:  { "orderId": "o1", "amount": 6998 }
201:      { "id": "pay1", "orderId": "o1", "amount": 6998, "status": "SUCCESS", "processedAt": "..." }
400:      { "error": "orderId and amount are required" }
```

## Notification Service (JWT required)

### GET /notifications
```
200:      [{ "id": "n1", "type": "ORDER_CREATED", "payload": {...}, "createdAt": "..." }, ...]
```

---

# Part 13: Checkout Sequence Diagram

```
User          CheckoutPage       Gateway        Order         Payment        Cart        RabbitMQ      Notification
  |                |                 |             |              |             |              |               |
  | Place Order    |                 |             |              |             |              |               |
  |--------------->|                 |             |              |             |              |               |
  |                | POST /order/orders            |              |             |              |               |
  |                |----------------------------->|              |             |              |               |
  |                |                 |             | INSERT orders|             |              |               |
  |                |                 |             | publish order.created     |              |               |
  |                |                 |             |----------------------------------------->|               |
  |                |                 |             |             |              |              | order.created |
  |                |                 |             |             |              |              |-------------->|
  |                | 201 { order }   |             |              |             |              |               |
  |                |<-----------------------------|              |             |              |               |
  |                | POST /payment/payments        |              |             |              |               |
  |                |--------------------------------------------->|             |              |               |
  |                |                 |             |              | publish payment.completed   |               |
  |                |                 |             |              |----------------------------------------->|   |
  |                |                 |             |              |             |              | payment.completed
  |                |                 |             |              |             |              |-------------->|
  |                | 201             |             |              |             |              |               |
  |                |<---------------------------------------------|             |              |               |
  |                | PATCH order status            |              |             |              |               |
  |                |----------------------------->|              |             |              |               |
  |                | DELETE cart     |             |              |             |              |               |
  |                |----------------------------------------------------------->|              |               |
  |                | navigate /order-confirmation/o1             |             |              |               |
  |<---------------|                 |             |              |             |              |               |
```

---

# Part 14: localStorage Keys

| Key | Content | Used By |
|-----|---------|---------|
| cloudcommercx_user | `{ id, email, token }` JSON | App (auth state), api.js (Authorization header) |
| cloudcommercx_notif_seen | Number (last seen notification count) | NotificationsDropdown (badge) |

---

This report documents every service, endpoint, component, state, flow, and implementation detail in the CloudCommercX system as implemented for Review-1.
