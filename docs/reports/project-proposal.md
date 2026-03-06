# Project Proposal

## Cover Details

- Project Title: CloudCommercX - Microservices E-Commerce Platform
- Course: SDP
- Team Members: `<fill>`
- Guide Name: `<fill>`
- Date: `<fill>`

## Abstract

CloudCommercX is a learning-oriented e-commerce platform designed using microservices architecture. The project decomposes business capabilities such as authentication, catalog, cart, order, payment, and notifications into independent services behind an API gateway. The goal is to understand practical service boundaries, asynchronous communication, containerized deployment, and observability in a real development workflow. The implementation uses Node.js-based services, Docker Compose, and monitoring with Prometheus and Grafana. The expected outcome is an end-to-end runnable system with modular services, measurable progress at each SDP review, and structured documentation suitable for academic evaluation.

## Problem Statement

Monolithic implementations often mix unrelated concerns, limiting scalability and independent deployment. Students need a practical project to understand service-oriented design and modern deployment practices.

## Objectives

- Build a complete e-commerce flow with separated business services.
- Demonstrate synchronous and asynchronous inter-service communication.
- Deploy entire stack through Docker Compose.
- Integrate monitoring for runtime visibility.
- Produce review-wise measurable results and documentation.

## Proposed Architecture

Refer:
- `docs/architecture.md`
- `docs/api-contracts.md`

## Tech Stack Justification

- Node.js + Express: fast iteration and low setup overhead.
- RabbitMQ: lightweight event broker for asynchronous workflows.
- Docker Compose: simple local orchestration for multiple services.
- Prometheus + Grafana: standard observability stack.

## Expected Outcomes

- Review-ready microservices implementation with runnable demo.
- Report pack for all SDP checkpoints.
- Foundation for future upgrades (real DB integration, Kubernetes, CI/CD).

## Timeline

- Weeks 1-2: scope + architecture
- Weeks 3-5: auth/catalog/gateway/frontend
- Weeks 6-8: cart/order + integration tests
- Weeks 9-10: payment/notification + event flow
- Weeks 11-12: containerization + observability
- Weeks 13-16: hardening + final report/demo
