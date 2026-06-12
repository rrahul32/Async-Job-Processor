# Database Schema — Distributed Workflow Orchestration Platform

> **Keep this in sync.** This document is the human-readable view of
> [`prisma/schema.prisma`](../prisma/schema.prisma). Whenever the schema changes
> (models, fields, relations, enums, indexes, or delete behavior), update the
> diagrams and notes below in the same change. A hook reminds you on edit, but
> the regeneration is manual — the dataflow diagram and commentary are hand-authored.

The schema splits into two halves:

- **Definitions (seeded, few rows):** `Workflow` → `WorkflowStep`. The template —
  e.g. `order-processing` and its ordered steps.
- **Instances (per order, high cardinality):** `WorkflowRun` → `StepExecution` →
  `RetryHistory`, plus `DeadLetterQueue`. One set created per order.

## 1. Entity-Relationship Diagram (structure)

```mermaid
erDiagram
    Workflow ||--o{ WorkflowStep : "steps (Cascade)"
    Workflow ||--o{ WorkflowRun : "runs (Restrict)"
    WorkflowRun ||--o{ StepExecution : "stepExecutions (Cascade)"
    WorkflowStep |o--o{ StepExecution : "stepExecutions (SetNull)"
    StepExecution ||--o{ RetryHistory : "retries (Cascade)"
    WorkflowRun |o--o{ DeadLetterQueue : "deadLetters (SetNull)"

    Workflow {
        uuid id PK
        string name UK
        int version
        string description "nullable"
        datetime createdAt
        datetime updatedAt
    }
    WorkflowStep {
        uuid id PK
        uuid workflowId FK
        string name
        int position
        datetime createdAt
        datetime updatedAt
    }
    WorkflowRun {
        uuid id PK
        uuid workflowId FK
        string orderId UK
        enum status "PENDING-QUEUED-RUNNING-COMPLETED|FAILED"
        json input "nullable"
        datetime startedAt "nullable"
        datetime finishedAt "nullable"
        datetime createdAt
        datetime updatedAt
    }
    StepExecution {
        uuid id PK
        uuid workflowRunId FK
        uuid workflowStepId FK "nullable"
        enum status "PENDING-RUNNING-COMPLETED|FAILED"
        int attempts
        json output "nullable"
        string error "nullable"
        datetime startedAt "nullable"
        datetime finishedAt "nullable"
    }
    RetryHistory {
        uuid id PK
        uuid stepExecutionId FK
        int attempt
        string error "nullable"
        datetime createdAt
    }
    DeadLetterQueue {
        uuid id PK
        uuid workflowRunId FK "nullable"
        string jobId
        string queueName
        json payload
        string failureReason "nullable"
        enum status "PENDING|REPLAYED"
        datetime createdAt
        datetime replayedAt "nullable"
    }
```

## 2. Dataflow Diagram (how an order moves through it)

Each table mapped to the lifecycle stage and the task that writes it.

```mermaid
flowchart TD
    subgraph SEED["Definitions — seeded once"]
        WF["Workflow<br/>(template)"]
        WS["WorkflowStep<br/>(ordered steps)"]
        WF -->|defines| WS
    end

    ORDER(["POST /orders<br/>validated payload"])

    subgraph INST["Instances — one set per order"]
        WR["WorkflowRun<br/>status: PENDING-QUEUED-RUNNING-COMPLETED/FAILED<br/>holds input JSON, orderId"]
        SE["StepExecution<br/>append-only audit per step<br/>attempts, output, error"]
        RH["RetryHistory<br/>one row per retry attempt"]
        DLQ["DeadLetterQueue<br/>durable record of exhausted jobs"]
    end

    ORDER -->|"task 04: create run"| WR
    WF -.->|"FK workflowId (Restrict)"| WR
    WR -->|"task 05: worker runs each step"| SE
    WS -.->|"FK workflowStepId (SetNull, nullable)"| SE
    SE -->|"task 06: each retry"| RH
    SE -->|"retries exhausted (task 07)"| DLQ
    WR -.->|"FK workflowRunId (SetNull, nullable)"| DLQ

    RECOVERY{{"task 10: recovery sweep<br/>scans @@index(status)<br/>for non-terminal runs"}}
    WR -.->|"finds PENDING/QUEUED/RUNNING"| RECOVERY
    RECOVERY -.->|"re-drives"| WR

    style SEED fill:#e8f0fe,stroke:#4285f4
    style INST fill:#fef7e8,stroke:#fbbc04
```

## 3. Design notes the diagrams reveal

- **Delete behavior encodes intent.** Definitions can't be deleted while runs
  exist (`Restrict` on `WorkflowRun → Workflow`), protecting audit history. Audit
  records *survive* definition changes: `StepExecution.workflowStepId` and
  `DeadLetterQueue.workflowRunId` are nullable + `SetNull`, so they outlive the
  rows they point at. Within a run, everything cascades (delete a run → its
  executions and retries go too).
- **`orderId` is the external handle.** It's `@unique` on `WorkflowRun` so
  `GET /orders/:id` can find a run by business order id, while `id` (uuidv7) is the
  internal key.
- **Status enums + indexes drive recovery.** Both `WorkflowRun.status` and
  `StepExecution.status` are indexed so task 10's crash-recovery sweep can cheaply
  find non-terminal (stuck) work.
- **The DLQ is deliberately decoupled.** It keeps `jobId` / `queueName` / `payload`
  so a dead-lettered job is replayable even if its originating run row is gone.

## 4. Enums (lifecycle state machines)

| Enum | Values | Written by |
| --- | --- | --- |
| `WorkflowRunStatus` | `PENDING → QUEUED → RUNNING → COMPLETED \| FAILED` | tasks 04/07/10 |
| `StepExecutionStatus` | `PENDING → RUNNING → COMPLETED \| FAILED` | task 05 |
| `DeadLetterStatus` | `PENDING \| REPLAYED` | task 07 |

_Task 09 will extend the run and step enums with `COMPENSATED`._
