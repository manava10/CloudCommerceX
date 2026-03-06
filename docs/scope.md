# Scope Freeze and Milestones

## Problem Statement

Traditional monolithic e-commerce systems are difficult to evolve and scale team-wise. This project demonstrates how a modular microservices design improves separation of concerns and deployment flexibility.

## Finalized Scope

- Users can register/login and receive JWT tokens.
- Users can browse products from catalog.
- Users can add items to cart and update quantities.
- Users can place orders from cart.
- Payments are processed through a mock payment service.
- Notifications are generated asynchronously from events.

## Out of Scope (for SDP timeline)

- Real payment gateway integration
- Search indexing engines
- Multi-region deployment
- Full Kubernetes production rollout

## Service Boundaries (Code Ownership)

| Service | Owns | Path prefix | Do NOT put here |
|---------|------|-------------|-----------------|
| auth | users, JWT | `/api/auth` | product/cart/order logic |
| catalog | products | `/api/catalog` | user/cart/order logic |
| cart | cart items | `/api/cart` | order/payment logic |
| order | orders, order_items | `/api/order` | payment processing |
| payment | payment records | `/api/payment` | order status updates |
| notification | notification logs | `/api/notification` | business logic |
| gateway | routing, static files | `/` | business logic (only forwards) |

**Rule:** Each service owns its data. Cross-service flow = API calls or events (RabbitMQ).

## Milestone Mapping

- Review 1: scope, architecture, auth + catalog + gateway + baseline UI
- Review 2: cart + order + integration tests + container progress
- Review 3: payment + notification + full compose deployment + monitoring
- Final: complete report and end-to-end demo evidence
