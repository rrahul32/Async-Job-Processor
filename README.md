# Distributed Workflow Orchestration Platform

A production-oriented workflow orchestration platform for e-commerce backends,
designed around Node.js, NestJS, Redis, BullMQ, PostgreSQL, and Prisma.

The project explores the mechanics behind durable, asynchronous execution:
distributed workers, retries, state persistence, fault recovery,
observability, and compensation workflows. It is inspired by orchestration
engines such as [Temporal](https://temporal.io/),
[Cadence](https://cadenceworkflow.io/), and
[AWS Step Functions](https://aws.amazon.com/step-functions/).

## Status

This project is in active development. The current target is Phase 1:
establish queue infrastructure, worker execution, retries, asynchronous
processing, and PostgreSQL-backed workflow state.

## Goals

The platform is intended to support e-commerce workflow scenarios including:

- Order processing
- Inventory reservation
- Payment processing
- Invoice generation
- Shipping orchestration
- Retry recovery
- Saga-based compensation handling

## Target Architecture

```text
Client/API Request
        |
        v
API Gateway
        |
        v
Workflow Engine
        |
        v
BullMQ Queue <--> Redis
        |
        v
Distributed Workers
        |
        v
PostgreSQL Persistence
        |
        v
Observability Stack
```

An example order workflow:

```text
Create Order
    |
    v
Reserve Inventory
    |
    v
Process Payment
    |
    v
Generate Invoice
    |
    v
Send Confirmation Email
    |
    v
Mark Workflow Complete
```

The initial processing flow is planned as:

```text
POST /orders
      |
      v
Save Order
      |
      v
Push Job To Queue
      |
      v
Worker Picks Job
      |
      v
Execute Workflow Steps
      |
      v
Persist State
      |
      v
Retry On Failure
      |
      v
Complete Workflow
```

## Technology Stack

| Area | Technology |
| --- | --- |
| Backend | Node.js, TypeScript, NestJS |
| Queues | Redis, BullMQ |
| Database | PostgreSQL, Prisma ORM |
| Infrastructure | Docker, Docker Compose |
| Observability | OpenTelemetry, Prometheus, Grafana |

## Planned Features

- Durable workflow execution and recovery after crashes
- Configurable retries, delayed jobs, and dead-letter queues
- Saga compensation support
- Dynamic DAG workflows
- Distributed worker heartbeats and horizontal scaling
- OpenTelemetry traces, Prometheus metrics, and Grafana dashboards
- Workflow visualization
- Fault injection and load testing

## Proposed Project Structure

Initial application layout:

```text
src/
|-- orders/
|-- queue/
|-- workers/
|-- workflows/
|-- common/
`-- main.ts
```

Potential monorepo evolution:

```text
apps/
  api-gateway/
  workflow-engine/
  worker-service/

packages/
  shared/
  sdk/
```

## Local Development

The commands and variables below describe the intended local development
contract once the application scaffold and Docker configuration are present.

### Prerequisites

- Node.js 22 LTS (recommended; see `.nvmrc`)
- Docker and Docker Compose
- PostgreSQL
- Redis

### Installation

```bash
git clone <repo-url>
cd distributed-workflow-engine
nvm use
npm install
```

### Environment Variables

Create a `.env` file:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflows
REDIS_HOST=localhost
REDIS_PORT=6379
```

Environment variables are loaded centrally through Nest's `ConfigModule`.
Runtime modules consume typed application and Redis settings from the
configuration service rather than reading environment variables directly.

### Run Infrastructure and Backend

```bash
docker-compose up --build
npm run start:dev
```

### API Documentation

When the backend is running, interactive Swagger documentation is available at:

```text
http://localhost:3000/docs
```

The generated OpenAPI JSON document is available at:

```text
http://localhost:3000/docs-json
```

## Planned Persistence Model

The workflow engine is expected to persist operational state in tables such as:

- `workflows`
- `workflow_runs`
- `workflow_steps`
- `step_executions`
- `retry_history`
- `dead_letter_queue`

## Roadmap

| Phase | Focus |
| --- | --- |
| 1 | Redis queues, workers, retries, and PostgreSQL persistence |
| 2 | Durable execution, recovery, and distributed workers |
| 3 | Tracing, metrics, monitoring, and dashboards |
| 4 | Horizontal scaling, fault injection, CI/CD, and load testing |
| 5 | DAG workflows, compensation engine, Kafka support, and benchmarking |

## Learning Objectives

This project is a practical deep dive into:

- Distributed systems and backend scalability
- Asynchronous processing and worker coordination
- Idempotency, retries, backoff, and failure recovery
- Durable state management and compensation workflows
- Tracing, structured logging, metrics, and production debugging

## Author

Rahul Reghu

- [GitHub: rrahul32](https://github.com/rrahul32)
- [LinkedIn: Rahul Reghu](https://linkedin.com/in/rrahul32)

## References

- [Temporal Documentation](https://docs.temporal.io/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
