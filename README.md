# Distributed Workflow Orchestration Platform

A production-oriented workflow orchestration platform for e-commerce backends,
designed around Node.js, NestJS, Redis, BullMQ, RabbitMQ, PostgreSQL, and
Prisma.

The project explores the mechanics behind durable, asynchronous execution:
distributed workers, retries, state persistence, fault recovery, read caching,
reliable event publishing, observability, and compensation workflows. It is
inspired by orchestration engines such as [Temporal](https://temporal.io/),
[Cadence](https://cadenceworkflow.io/), and
[AWS Step Functions](https://aws.amazon.com/step-functions/).

Every notable failure found while building and load-testing the platform —
induced or genuine — is recorded in [`INCIDENTS.md`](INCIDENTS.md) as
*symptom → diagnosis → fix → lesson*, because operating a system teaches more
than building it.

## Status

This project is in active development. Tasks 01–03 are done (hardened local
infrastructure, validated order intake, Postgres/Prisma persistence). The
current target is completing Phase 1: workflow state persistence and real step
execution. See the full backlog in [`tasks/README.md`](tasks/README.md).

## Goals

The platform is intended to support e-commerce workflow scenarios including:

- Order processing
- Inventory reservation
- Payment processing (rate-limited, circuit-broken external calls)
- Invoice generation
- Shipping orchestration
- Retry recovery and dead-lettering
- Saga-based compensation handling
- Lifecycle event publishing for external consumers

## Target Architecture

```text
Client
  |
  v
NestJS API  --(cache-aside reads)-->  Redis (cache: LRU, TTL+jitter,
  |   |                                      single-flight rebuild)
  |   '--(state + outbox event,
  |        one Postgres transaction)
  v
BullMQ Queue  <-->  Redis (queue: AOF, auth, noeviction)
  |
  v
Distributed Workers (xN)
  [steps - retries/backoff - idempotency - saga compensation]
  |                  |
  |                  '--> external providers (token-bucket rate limit,
  |                       circuit breaker, timeouts)
  v
PostgreSQL (workflow state, retry history, DLQ records, outbox)
  |
  v
Outbox Relay --> RabbitMQ (topic exchange) --> consumers (audit log, ...)
                     |
                     '--> Kafka topic (stretch) --> analytics / replay

Observability across all of it: pino JSON logs with correlation IDs,
Prometheus metrics + Grafana, OpenTelemetry traces.
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

The core processing flow:

```text
POST /orders
      |
      v
Validate + idempotency key
      |
      v
Save Order + Workflow State (+ outbox event, same transaction)
      |
      v
Push Job To Queue
      |
      v
Worker Picks Job
      |
      v
Execute Workflow Steps (resume from last completed on crash)
      |
      v
Persist State / Publish Lifecycle Events
      |
      v
Retry On Failure -> DLQ on exhaustion / Saga compensation on partial failure
      |
      v
Complete Workflow
```

## Technology Stack

| Area | Technology |
| --- | --- |
| Backend | Node.js, TypeScript, NestJS |
| Job queue | Redis, BullMQ |
| Event bus | RabbitMQ (transactional outbox); Kafka (stretch: streaming + replay) |
| Caching | Redis (cache-aside, stampede protection) |
| Database | PostgreSQL, Prisma ORM |
| Infrastructure | Docker, Docker Compose |
| Observability | pino structured logging, OpenTelemetry, Prometheus, Grafana |
| Quality | Jest, k6 load testing, fault injection, GitHub Actions CI |

## Planned Features

- Durable workflow execution and recovery after crashes
- Configurable retries, delayed jobs, and dead-letter queues
- Idempotent intake and step execution
- Saga compensation support
- Read caching with deliberate invalidation and stampede protection
- Reliable lifecycle event publishing (transactional outbox → RabbitMQ;
  Kafka streaming + replay as a stretch goal)
- Distributed rate limiting and circuit breakers for external calls
- Distributed worker heartbeats and horizontal scaling
- Structured JSON logs with correlation IDs propagated through the queue
- OpenTelemetry traces, Prometheus metrics, and Grafana dashboards
- Dynamic DAG workflows
- Fault injection and load testing, with findings logged in
  [`INCIDENTS.md`](INCIDENTS.md)

## Proposed Project Structure

Initial application layout:

```text
src/
|-- orders/
|-- queue/
|-- workers/
|-- workflows/
|-- cache/
|-- events/        # outbox relay + consumers
|-- common/
`-- main.ts
```

Potential monorepo evolution:

```text
apps/
  api-gateway/
  workflow-engine/
  worker-service/
  event-consumers/

packages/
  shared/
  sdk/
```

## Local Development

The commands and variables below describe the local development contract.
Redis and PostgreSQL run as containers via Docker Compose, so you don't install
them on the host.

### Prerequisites

- Node.js 22 LTS (recommended; see `.nvmrc`)
- Docker and Docker Compose (provide Redis + PostgreSQL — see below)

### Installation

```bash
git clone <repo-url>
cd distributed-workflow-engine
nvm use
npm install
```

### Environment Variables

Copy the template to create your local `.env`:

```bash
cp .env.example .env
```

It contains:

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=localdev_redis_pw
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflows
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=workflows
```

The defaults match the Compose stack, so the app and `docker compose` both work
out of the box. Environment variables are loaded centrally through Nest's
`ConfigModule`; runtime modules consume typed application and Redis settings from
the configuration service rather than reading environment variables directly.

> **Security:** `REDIS_PASSWORD` is a local-dev placeholder — Redis requires auth
> even locally. Override it (and the Postgres credentials) with strong secrets in
> every non-local environment.

### Run Infrastructure and Backend

A single `docker-compose.yml` provides the shared Redis (BullMQ) and PostgreSQL
services so every contributor runs the same versions. Bring the stack up, then
start the backend:

```bash
npm run infra:up      # docker compose up -d  (redis + postgres, detached)
npm run start:dev     # NestJS in watch mode, connects to Redis automatically
```

Useful infrastructure scripts:

| Script | Action |
| --- | --- |
| `npm run infra:up` | Start Redis + Postgres in the background |
| `npm run infra:down` | Stop and remove the containers (named volumes persist) |
| `npm run infra:logs` | Tail logs from all infrastructure services |

Both services declare healthchecks; `docker compose ps` shows each as `healthy`
once ready. Data lives in named volumes (`redis-data`, `postgres-data`), so it
**survives `docker compose down && up`**. To wipe state, run
`docker compose down -v`.

The stack is hardened toward a production-grade bar: images are **digest-pinned**
(byte-identical across machines), **Redis requires auth** and never evicts queued
jobs (`maxmemory` + `noeviction`), and every service has **bounded memory/CPU**,
**rotated logs**, and a **graceful stop period**. Postgres runs with
`--data-checksums` to catch silent corruption. Later tasks add RabbitMQ, a cache
Redis, and the observability stack to the same Compose file at the same bar.

#### Optional inspection UIs

[redis-commander](https://github.com/joeferner/redis-commander) (browse BullMQ
queues) and [pgAdmin](https://www.pgadmin.org/) (browse the database) are wired
behind a `tools` profile, so they stay off during normal development:

```bash
docker compose --profile tools up -d
```

- redis-commander → http://localhost:8081
- pgAdmin → http://localhost:8082 (login `admin@local.dev` / `admin`)

### API Documentation

When the backend is running, interactive Swagger documentation is available at:

```text
http://localhost:3000/docs
```

The generated OpenAPI JSON document is available at:

```text
http://localhost:3000/docs-json
```

## Persistence Model

The workflow engine persists operational state in tables such as:

- `workflows`
- `workflow_runs`
- `workflow_steps`
- `step_executions`
- `retry_history`
- `dead_letter_queue`
- `outbox_events`

## Roadmap

| Phase | Focus |
| --- | --- |
| 1 | Foundations — infra, validation, persistence, workflow state & step execution |
| 2 | Resilience — structured logging/correlation IDs, retries, DLQ, idempotency |
| 3 | Caching & eventing — read cache with stampede protection; transactional outbox + RabbitMQ |
| 4 | Distributed execution — saga compensation, durable recovery, scaling, health |
| 5 | Production operations — rate limiting & breakers, metrics, tracing, CI/CD + load & fault testing |
| 6 | Advanced — dynamic DAG engine; Kafka streaming & replay (stretch) |

The dependency-ordered backlog with per-task scope and acceptance criteria lives
in [`tasks/README.md`](tasks/README.md).

## Learning Objectives

This project is a practical deep dive into:

- Distributed systems and backend scalability
- Asynchronous processing and worker coordination
- Queueing vs brokering vs streaming — BullMQ, RabbitMQ, and Kafka, each used
  where it fits, with the trade-offs felt rather than recited
- Production caching: cache-aside, invalidation, TTL jitter, stampede defense
- Reliable event publishing: the dual-write problem and the transactional outbox
- Idempotency, retries, backoff, rate limiting, circuit breaking, and failure
  recovery
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
- [Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [RabbitMQ Documentation](https://www.rabbitmq.com/docs)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
