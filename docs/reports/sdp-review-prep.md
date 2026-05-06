# SDP Review Preparation Guide — CloudCommercX

## Cover Details (fill before submission)
- Project Title: CloudCommercX - Microservices E-Commerce Platform
- Team Members: `<fill>`
- Guide Name: `<fill>`
- Review Date: `<fill>`

---

## 1. One‑Page Summary (for opening pitch)
**Problem:** Monolithic e‑commerce systems are hard to scale and evolve.  
**Solution:** CloudCommercX demonstrates a modular microservices architecture with synchronous APIs and asynchronous eventing.  
**Outcome:** A runnable end‑to‑end e‑commerce flow, containerized with Docker Compose, with monitoring and review‑ready documentation.

**Key highlights to mention:**
- Clear service boundaries (auth, catalog, cart, order, payment, notification, gateway)
- Event‑driven workflow (order.created → payment.completed → notification)
- Observability stack (Prometheus + Grafana)
- Fully containerized deployment and simple local run

---

## 2. Objectives and Scope (what reviewers expect)
### Objectives
- Build a complete e‑commerce flow with separated business services.
- Show synchronous and asynchronous inter‑service communication.
- Deploy the whole stack with Docker Compose.
- Add monitoring and metrics endpoints.
- Produce review-ready deliverables and reports.

### In Scope (implemented)
- User registration/login with JWT
- Product catalog listing
- Cart management
- Order placement
- Mock payment processing
- Event‑based notifications

### Out of Scope (explicitly stated)
- Real payment gateway integration
- Search/indexing engines
- Kubernetes production rollout
- Multi‑region deployment

Source: `docs/scope.md`

---

## 3. Architecture Overview (explain in 60 seconds)
### High‑Level Diagram (refer in review)
See `docs/architecture.md` for diagram.

### Core Principles
- **API Gateway** is the only entry point for clients.
- **Service Ownership:** each service owns its data and logic.
- **Sync + Async Mix:** HTTP for request/response, RabbitMQ for events.

### Services at a Glance
| Service | Responsibilities | Data Store |
|---------|-------------------|-----------|
| Gateway | Routes `/api/*`, serves frontend | — |
| Auth | Users, JWT | PostgreSQL (optional) |
| Catalog | Product list | In-memory |
| Cart | User cart state | PostgreSQL (optional) |
| Order | Orders + order items | PostgreSQL (optional) |
| Payment | Mock payments | In-memory |
| Notification | Event-based alerts | In-memory |

---

## 4. Module‑Wise Implementation (talking points)
### Gateway (`services/gateway`)
- Single entry point; routes `/api/<service>` to target.
- Injects JWT secret to validate auth flow.

### Auth (`services/auth`)
- `POST /register`, `POST /login`
- Issues JWT on login
- User data stored in PostgreSQL when `DATABASE_URL` is set

### Catalog (`services/catalog`)
- `GET /products`, `GET /products/:id`
- Static product list (keeps demo lightweight)

### Cart (`services/cart`)
- `GET /cart/:userId`
- `POST /cart/:userId/items`
- `DELETE /cart/:userId/items/:productId` and `DELETE /cart/:userId`

### Order (`services/order`)
- `POST /orders` creates order and publishes `order.created`
- `PATCH /orders/:id/status` updates payment state

### Payment (`services/payment`)
- `POST /payments` processes mock payment
- Publishes `payment.completed`

### Notification (`services/notification`)
- Subscribes to `order.created` and `payment.completed`
- Stores notification logs for users

---

## 5. End‑to‑End Flow (explain with a diagram or steps)
1. User registers and logs in → JWT issued.
2. User browses products and adds to cart.
3. User places order → order service publishes `order.created`.
4. Payment service processes → publishes `payment.completed`.
5. Notification service records notifications for the user.

**Asynchronous Events:**  
`order.created` → `payment.completed` → `notification` updates

---

## 6. API Contracts (quick reference)
Gateway routes:
```
/api/auth/*           → auth
/api/catalog/*        → catalog
/api/cart/*           → cart
/api/order/*          → order
/api/payment/*        → payment
/api/notification/*   → notification
```

Full API tables: `docs/api-contracts.md`

---

## 7. Deployment & Run Guide (what you’ll show)
### Option A — Docker (recommended)
```bash
docker compose up --build
```
- App: http://localhost:3000
- Grafana: http://localhost:3001
- RabbitMQ: http://localhost:15672

### Option B — Local (no Docker)
```bash
npm install
npm run start:all
cd frontend-react && npm install && npm run dev
```

Detailed steps: `docs/DEPLOYMENT-GUIDE.md`

---

## 8. Demo Script (repeatable walkthrough)
1. Start Docker Compose.
2. Open app at http://localhost:3000
3. Register a new user and log in.
4. Browse products and add to cart.
5. Checkout → create order → mock payment.
6. Open notifications (bell icon) and show event result.
7. Open Grafana dashboard (optional).

---

## 9. Testing Evidence
Run:
```bash
npm test
```
Tests:
- `tests/auth-catalog.test.js`
- `tests/cart-order.test.js`

---

## 10. Monitoring & Metrics
- Every service exposes `/metrics` (Prometheus scrape target).
- Grafana provisioned dashboards in `monitoring/grafana`.
- Prometheus config in `monitoring/prometheus/prometheus.yml`.

---

## 11. Risks, Constraints, and Mitigations
| Risk / Constraint | Impact | Mitigation |
|-------------------|--------|------------|
| In-memory data for some services | Data loss on restart | Optional PostgreSQL integration |
| RabbitMQ down | No notifications | Services degrade gracefully |
| JWT misconfiguration | Auth failures | Keep same `JWT_SECRET` in auth + gateway |

---

## 12. Review Q&A Cheat Sheet
**Q: Why microservices here?**  
A: To demonstrate service boundaries, independent deployment, and event‑driven integration suitable for SDP learning goals.

**Q: How do services communicate?**  
A: Synchronous HTTP via gateway and async events via RabbitMQ.

**Q: What proves integration?**  
A: End‑to‑end tests + event flow from order → payment → notification.

**Q: What is the current limitation?**  
A: Mock payment and limited persistence; focus is on architecture and flow.

**Q: What’s next?**  
A: Persistent storage, Kubernetes rollout, CI/CD, tracing.

---

## 13. Handy Links (for reviewers)
- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/DEPLOYMENT-GUIDE.md`
- `docs/scope.md`
- `docs/reports/final-report.md`
