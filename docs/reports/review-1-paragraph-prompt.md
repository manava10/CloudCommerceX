# Review-1 — Paragraph-Wise Prompt

Use these paragraphs for your Review-1 presentation or report. Concise and structured.

---

## 1. Project Introduction
CloudCommercX is a full-stack microservices e-commerce platform built as an SDP (Software Development Process) project. The goal is to learn scalability and reliability by implementing a real e-commerce flow with user auth, product catalog, cart, orders, mock payment, and event-driven notifications.

---

## 2. Problem Statement
Traditional monolithic e-commerce systems are hard to evolve and scale. This project shows how a modular microservices design improves separation of concerns and deployment flexibility. Each service owns its data; cross-service communication happens only via APIs or events.

---

## 3. Scope Completed
We implemented the full flow: user registration and login with JWT, product catalog browsing, cart management (add/remove with PostgreSQL persistence), order placement, mock payment processing, and notifications driven by RabbitMQ events. The React frontend includes protected routes, loading states, and toast notifications.

---

## 4. Architecture
A single API gateway (port 3000) is the entry point. It routes requests to six backend services: Auth, Catalog, Cart, Order, Payment, and Notification. Auth, Cart, and Order use PostgreSQL; Catalog, Payment, and Notification use in-memory storage. RabbitMQ handles async events: Order and Payment publish `order.created` and `payment.completed`; Notification consumes them.

---

## 5. Services Overview
Auth handles registration and login and issues JWTs. Catalog serves product listings. Cart manages user cart items. Order creates orders and updates status. Payment processes mock payments. Notification stores and serves event-based notifications. The gateway validates JWT for protected routes (cart, order, payment, notification) and serves the React SPA.

---

## 6. Communication Model
Synchronous flow: Client → Gateway → Service over HTTP. Asynchronous flow: Order and Payment publish events to RabbitMQ; Notification subscribes and stores them. This event-driven design keeps services loosely coupled and supports scalability.

---

## 7. Deployment
The system runs locally with `npm run start:all` or via Docker with `docker compose up`. Docker runs 10 containers: 7 app services, RabbitMQ, Prometheus, and Grafana. Each service has its own container for isolation and independent scaling.

---

## 8. Testing and Evidence
We have integration tests for auth/catalog and cart/order flows. All services expose health and metrics endpoints. The frontend supports the full user journey: browse, sign up, add to cart, checkout, and view orders and notifications.

---

## 9. Challenges and Solutions
We fixed JWT mismatch by ensuring the gateway loads the same `JWT_SECRET` as Auth. Notifications required adding dotenv to the notification and payment services and setting `RABBITMQ_URL`. We also handled 401 responses so notification fetch failures do not log the user out.

---

## 10. Conclusion
Review-1 delivers a working microservices e-commerce app with scope freeze, architecture definition, and full implementation. The system is deployable via Docker and ready for further hardening in later reviews.
