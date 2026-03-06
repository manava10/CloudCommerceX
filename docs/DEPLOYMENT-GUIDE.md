# CloudCommercX — Detailed Deployment Guide

Step-by-step instructions to run the app locally with Docker or without Docker.

---

## Prerequisites

### For Docker deployment
- **Docker Desktop** (includes Docker Compose)
  - macOS/Windows: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
  - Linux: `sudo apt install docker.io docker-compose-plugin` (or equivalent)
- **Node.js 20+** (for building frontend before Docker, optional)

### For non-Docker deployment
- **Node.js 20+**
- **PostgreSQL** (or Aiven cloud DB)
- **RabbitMQ** (optional, for notifications)

---

# Option A: Run with Docker (Recommended)

## Step 1: Open terminal and go to project folder

```bash
cd /Users/manava/Desktop/CloudCommercX
```

## Step 2: Ensure Docker is running

```bash
docker --version
docker compose version
```

You should see version numbers. If not, start Docker Desktop.

## Step 3: (Optional) Configure PostgreSQL

If you want persistent data (users, cart, orders):

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set:
   ```
   DATABASE_URL=postgres://user:password@host:port/database?sslmode=require
   JWT_SECRET=your-secret-key
   ```

3. Run migration (from host, with DB reachable):
   ```bash
   npm run migrate
   ```

4. Add env to Docker: create `docker-compose.override.yml`:
   ```yaml
   services:
     auth:
       env_file: [.env]
     cart:
       env_file: [.env]
     order:
       env_file: [.env]
     gateway:
       environment:
         - JWT_SECRET=${JWT_SECRET}
   ```
   Or set `env_file: [.env]` in docker-compose for each service.

**Without PostgreSQL:** Services use in-memory storage. Data is lost when containers stop.

## Step 4: Build and start all services

```bash
docker compose up --build
```

**What happens:**
- Builds 7 Node.js service images (first time takes 2–5 minutes)
- Pulls RabbitMQ, Prometheus, Grafana images
- Starts all containers
- Frontend is built inside the image

**Expected output:**
```
[+] Building ...
[+] Running 10/10
 ✔ Container cloudcommercx-rabbitmq-1    Started
 ✔ Container cloudcommercx-auth-1        Started
 ✔ Container cloudcommercx-catalog-1    Started
 ...
```

## Step 5: Open the app

- **App:** http://localhost:3000
- **RabbitMQ Management:** http://localhost:15672 (login: `guest` / `guest`)
- **Grafana:** http://localhost:3001 (login: `admin` / `admin`)

## Step 6: Test the app

1. Open http://localhost:3000
2. Click **Sign up** → create account
3. Browse products → **Add to cart**
4. Open cart → **Proceed to Checkout**
5. Fill address → Continue → Fill mock payment → **Pay**
6. Check **bell icon** for notifications

## Step 7: Stop the stack

Press `Ctrl+C` in the terminal, or in another terminal:

```bash
docker compose down
```

---

# Option B: Run without Docker (Local)

## Step 1: Install dependencies

```bash
cd /Users/manava/Desktop/CloudCommercX
npm install
```

## Step 2: Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgres://user:pass@host:port/db?sslmode=require
JWT_SECRET=your-secret-key
RABBITMQ_URL=amqp://localhost:5672
```

## Step 3: Run database migration

```bash
npm run migrate
```

## Step 4: Start RabbitMQ (for notifications)

**Option A — Homebrew (macOS):**
```bash
brew install rabbitmq
brew services start rabbitmq
```

**Option B — Docker (RabbitMQ only):**
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

**Option C — Skip:** Leave `RABBITMQ_URL` unset. App works, but no notifications.

## Step 5: Start all services

```bash
npm run start:all
```

Output:
```
started: auth
started: catalog
started: cart
...
All services started. Open http://localhost:3000
```

## Step 6: Build and run frontend (dev mode)

In a **new terminal**:

```bash
cd /Users/manava/Desktop/CloudCommercX/frontend-react
npm install
npm run dev
```

- Dev UI: http://localhost:5173 (with hot reload)
- Or use http://localhost:3000 after `npm run build:frontend` (from project root)

## Step 7: Stop

Press `Ctrl+C` in each terminal.

---

# Troubleshooting

## Docker: "port is already allocated"
Another process is using the port. Stop it or change the port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"   # Use 3001 instead of 3000
```

## Docker: Build fails
- Ensure `package.json` and `package-lock.json` exist
- Run `npm run build:frontend` manually, then `docker compose up --build`

## "Invalid or expired token" / Login fails
- Auth and Gateway must use the same `JWT_SECRET`
- In Docker: set `JWT_SECRET` for both `auth` and `gateway`

## No notifications
- RabbitMQ must be running
- In Docker: RabbitMQ is included
- Locally: set `RABBITMQ_URL=amqp://localhost:5672` and start RabbitMQ

## Database connection failed
- Check `DATABASE_URL` format
- For Aiven: ensure `?sslmode=require` and `NODE_TLS_REJECT_UNAUTHORIZED=0` if needed
- Ensure DB is reachable from your machine (or Docker network)

## Prometheus/Grafana not loading
- Prometheus expects services at Docker network hostnames (`auth`, `gateway`, etc.)
- If Prometheus fails, the main app still works

---

# Port Reference

| Service   | Port  | URL                    |
|-----------|-------|------------------------|
| Gateway   | 3000  | http://localhost:3000  |
| Auth      | 4001  | (internal)             |
| Catalog   | 4002  | (internal)             |
| Cart      | 4003  | (internal)             |
| Order     | 4004  | (internal)             |
| Payment   | 4005  | (internal)             |
| Notification | 4006 | (internal)          |
| RabbitMQ  | 5672, 15672 | Management UI    |
| Grafana   | 3001  | http://localhost:3001  |
| Prometheus| 9090  | http://localhost:9090 |

---

# Quick Reference

| Task              | Docker                    | Local                    |
|-------------------|---------------------------|--------------------------|
| Start             | `docker compose up -d`     | `npm run start:all`      |
| Start + logs      | `docker compose up`       | (same)                   |
| Stop              | `docker compose down`      | Ctrl+C                   |
| Rebuild           | `docker compose up --build`| —                        |
| View logs         | `docker compose logs -f gateway` | (terminal)      |
| Run migration     | `npm run migrate` (host)   | `npm run migrate`        |
