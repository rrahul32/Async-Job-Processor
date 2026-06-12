# Incident Log

Every load test, fault injection, or surprising failure in this project gets an
entry here, written **at the moment of discovery** — not reconstructed later.
Building a system teaches the happy path; *operating* one teaches everything
else. This file is the everything else.

Induced failures (lab exercises, fault injection, deliberate misconfiguration)
count exactly like genuine surprises — mark them `[induced]`. What matters is
that the failure ran on a real running system and the diagnosis was real.

## Entry format

```markdown
## YYYY-MM-DD — <short title> [induced?]

- **Task/Phase:** which backlog task or activity surfaced it
- **Symptom:** what was observed, with numbers (RPS, p95/p99, error rate,
  queue depth, memory)
- **Diagnosis:** how it was traced (logs, metrics, traces, redis-cli, EXPLAIN…)
  and the actual root cause
- **Fix:** the change made, and why it works
- **Lesson:** the transferable principle — the sentence you'd say out loud to
  another engineer
- **Evidence:** before/after numbers; commit/dashboard links if applicable
```

Rules of the log:

- **Numbers or it didn't happen.** "It got slow" is a feeling; "p95 went
  80ms → 2.3s at 500 RPS" is an incident.
- **The diagnosis is the valuable part.** Capture the *path* to the root cause,
  including the dead ends.
- **One incident per entry**, newest first below.

---

<!-- Newest entries above this line’s replacement — add your first incident here. -->
