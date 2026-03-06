# Zeroth Review

## Cover Details

- Project Title: CloudCommercX - Microservices E-Commerce Platform
- Team Members: `<fill>`
- Guide Name: `<fill>`
- Date: `<fill>`

## Requirement Analysis

### Functional Requirements

- User registration and login
- Product listing and detail viewing
- Cart add/remove operations
- Order creation from cart items
- Payment processing (mock)
- Notification generation on order/payment events

### Non-Functional Requirements

- Modular service boundaries
- Dockerized deployment
- Basic observability with metrics
- Error-tolerant gateway routing

## Use Cases

- Customer browses catalog and adds item to cart.
- Customer places order and completes payment.
- System sends notification on events.

## Architecture Snapshot

See:
- `docs/architecture.md`

## Service Decomposition Rationale

- Independent scaling and deployment per domain.
- Separation of data ownership for maintainability.

## Wireframes and Data Design Draft

- UI baseline: `frontend/index.html`
- API contracts: `docs/api-contracts.md`

## Risk Register v1

- RabbitMQ downtime risk -> fallback mode and retries in future phase.
- Scope creep risk -> strict sprint-wise feature freeze.
- Timeline risk -> milestone checkpoints per review.

## Work Completed vs Planned

- Completed: scope freeze, architecture, service boundaries, API contracts.
- Planned next: auth/catalog/gateway implementation validation.
