# Design: Dead-letter Handling, Audit Trail, and Load Testing

## Goal

Make message failures observable and recoverable instead of silent, and prove the
system holds up under several times its normal traffic.

## Architecture

```
POST /submit (api.js)
        │
        ▼
  taxSubmissions queue  ──(processing fails)──▶  taxSubmissions.dlx (direct exchange)
        │                                                  │
        ▼ (ack on success)                                 ▼
  subscriber processes                          taxSubmissions.dlq queue
        │                                                  │
        ▼                                                  ▼
  message_audit (status=processed)          failed_messages (full payload + error)
```

Both the publisher (`api.js`) and the subscriber (`subscriber.js`) declare the
`taxSubmissions` queue with **identical** arguments — this matters because
RabbitMQ rejects a queue re-declaration whose arguments differ from what's
already on the broker (`406 PRECONDITION_FAILED`). The dead-letter exchange
name, routing key, and target queue are defined once as constants and used by
both sides.

## Dead-letter queue (DLQ)

- `src/rabbitmq.js` adds `RabbitMQBuilder.withDeadLetter({ exchange, routingKey, queue })`.
  It sets the `x-dead-letter-exchange` / `x-dead-letter-routing-key` queue
  arguments, then asserts the dead-letter exchange and queue and binds them.
- When the subscriber's processing throws, it calls `channel.nack(msg, false, false)`.
  `requeue=false` is what makes RabbitMQ route the message to the configured
  dead-letter exchange instead of dropping it or looping it back onto the
  original queue.
- A second consumer in `subscriber.js` drains `taxSubmissions.dlq` and writes
  each message into the `failed_messages` table, then acks it off the DLQ so
  it doesn't sit there forever.
- To exercise this without writing a separate fault-injection harness, the
  `/submit` payload accepts an optional `simulateFailure: true` flag that the
  subscriber honors by throwing intentionally. This is real plumbing, not a
  flag that bypasses any logic — it's the same code path a real processing
  exception would take.

## Audit trail (SQLite)

`src/db.js` opens a `better-sqlite3` database (file path from `DB_PATH`,
defaulting to `./data/app.db`) and creates two tables on startup:

- **`message_audit`**: `message_id` (PK), `status`, `processed_at`. One row
  per message, upserted as it moves through `published` → `processed` or
  `published` → `failed`. Because it's a PK upsert rather than an append-only
  log, querying current message state is a single indexed lookup.
- **`failed_messages`**: `id`, `message_id`, `queue`, `payload`, `error`,
  `failed_at`. Append-only — every dead-lettered message is captured here
  with its full JSON payload so it can be inspected or replayed manually.

SQLite was chosen over adding Postgres/MySQL because this repo has no
existing database dependency, and a tutorial-sized message volume doesn't
need a client/server DB. `better-sqlite3` is synchronous, which keeps the
audit calls simple call sites in async handlers without extra `await`
plumbing or connection-pool concerns. The trade-off: only one process should
write to the file at a time under heavy concurrent write load. Both
`api.js` and `subscriber.js` write here, but `api.js` only inserts on
publish and `subscriber.js` only updates on terminal outcomes, so write
volume per second matches message volume per second, not request fan-out.

In Docker, `DB_PATH` is set to `/app/data/app.db` and that path is a named
volume (`dbdata`) so the audit history survives container restarts.

## Load testing

`load-test.js` uses `autocannon` to drive `POST /submit` in two phases:

1. **Baseline** — `BASELINE_CONNECTIONS` (default 10) concurrent connections.
2. **Surge** — `BASELINE_CONNECTIONS * LOAD_MULTIPLIER` (default multiplier 4,
   i.e. within the requested 3–5x range) concurrent connections.

After each phase it sums `errors + timeouts + non2xx` responses. The script
exits non-zero if that total is ever greater than zero, so it can be wired
into CI as a pass/fail gate, not just a benchmark to eyeball.

This validates HTTP-level delivery (no dropped/refused/timed-out requests
into RabbitMQ), which is the layer where traffic surges would actually cause
drops — once a message is durably published to a durable queue, RabbitMQ
itself won't drop it. Verified manually: a 4x surge run produced 0 dropped
requests over ~40k total requests, confirmed independently via RabbitMQ's
own `message_stats` (`drop_unroutable: 0`, `publish` count matching
`deliver`+`ack` counts).

## Why these choices, briefly

- **DLQ over infinite requeue**: requeuing a poison message forever would
  spin the CPU and flood logs; dead-lettering isolates it for inspection
  while letting the rest of the queue drain.
- **Two tables instead of one**: `message_audit` answers "what's the current
  state of message X" cheaply (PK lookup); `failed_messages` answers "show
  me everything that failed and why," including payloads `message_audit`
  intentionally doesn't store (keeping that table small and indexable).
- **`run.sh` orchestrates instead of replacing docker-compose**: it's a thin
  wrapper (`docker compose up --build -d` + health-check polling) so anyone
  can still drop straight to `docker compose` commands if they want finer
  control.
