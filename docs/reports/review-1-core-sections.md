# CloudCommercX — Problem Statement, Solution, What We Do, Deployment

---

## Problem Statement

Traditional monolithic e-commerce systems are difficult to evolve and scale. As features grow, the codebase becomes tightly coupled, making it hard for teams to work independently. A single bug or change can affect the entire system. Deploying updates requires rebuilding and redeploying the whole application, which slows down development and increases risk. Monoliths also scale as a single unit, so you cannot scale only the parts that need more resources.

---

## Solution

We use a **microservices architecture**. The application is split into small, independent services—Auth, Catalog, Cart, Order, Payment, and Notification—each with its own responsibility and data. An API gateway acts as the single entry point and routes requests to the right service. Services talk to each other over HTTP (synchronous) or via a message broker like RabbitMQ (asynchronous). This design improves separation of concerns, allows independent deployment and scaling, and makes the system easier to maintain and evolve over time.

---

## What We Are Doing Here

We are building a full-stack e-commerce platform to learn scalability and reliability. Users can register, log in with JWT, browse products, add items to cart, place orders, and complete checkout with a mock payment. Notifications are generated asynchronously when orders are placed and payments are completed. We use PostgreSQL for users, cart, and orders; RabbitMQ for event-driven notifications; and a React frontend with protected routes and loading states. Each service owns its data and communicates only through APIs or events, following clear service boundaries.

---

## Deployment

We support two deployment modes:

**Docker (recommended):** Run `docker compose up --build` to start all services in containers. Docker Compose starts the gateway, six backend services, RabbitMQ, Prometheus, and Grafana. The app is available at http://localhost:3000. Images are reused on later runs, so startup is fast after the first build.

**Local (without Docker):** Run `npm run start:all` to start all Node.js services directly. You need Node.js, PostgreSQL (optional), and RabbitMQ (optional for notifications). The frontend can be served by the gateway after `npm run build:frontend`, or run in dev mode with `cd frontend-react && npm run dev` at http://localhost:5173.

Both modes run the same application; Docker provides consistency and isolation across environments.
