# Architecture and Data Ownership

## High-Level Architecture

```mermaid
flowchart LR
Client[Frontend] --> Gateway[GatewayService]
Gateway --> Auth[AuthService]
Gateway --> Catalog[CatalogService]
Gateway --> Cart[CartService]
Gateway --> Order[OrderService]
Gateway --> Payment[PaymentService]
Order --> Broker[EventBus]
Payment --> Broker
Broker --> Notification[NotificationService]
Auth --> AuthDB[(PostgreSQLUsers)]
Catalog --> CatalogDB[(MongoCatalog)]
Order --> OrderDB[(PostgreSQLOrders)]
Cart --> CartCache[(RedisCart)]
```

## Data Ownership

- `auth` owns users, passwords, and JWT claims data.
- `catalog` owns product records and inventory metadata.
- `cart` owns transient cart state keyed by user.
- `order` owns immutable order snapshots and order status.
- `payment` owns payment transaction state (mocked).
- `notification` owns delivery logs and event processing status.

## Communication Model

- Synchronous: gateway to internal services over HTTP.
- Asynchronous: `order.created` and `payment.completed` events via broker.

## Reliability Decisions

- Gateway timeout and fallback handling for downstream errors.
- Idempotent order creation by client-provided request id (future enhancement).
- Event consumers designed to tolerate duplicate events.
