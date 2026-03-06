# Review-2 Report

## Review Focus

Cart and order implementation, integration validation, and containerization progress.

## Completed Modules

- Cart service (`services/cart`)
- Order service (`services/order`)
- Integration tests (`tests/cart-order.test.js`)

## Integration Evidence

- Cart item add/update/remove endpoints.
- Order creation from cart item list.
- Order total calculation and creation timestamp.

## Dockerization Progress

- Multi-service `docker-compose.yml` created.
- Reusable service image via root `Dockerfile`.
- Service environment variables centralized in compose.

## Testing and Metrics

- Node test suite passes:
  - auth/catalog test
  - cart/order flow test

## Performance Baseline

- Runtime metrics endpoint enabled: `/metrics` for services.

## Risk Register v2

- Local-only storage limits persistence -> DB adapters planned.
- Broker dependency sensitivity -> graceful fallback in notification startup.

## Next Phase Plan

- Add payment and notification services to full event pipeline.
- Validate RabbitMQ-driven async events.
- Bring up monitoring stack in compose.
