# Tax Submission API with RabbitMQ & Docker

**A production-ready Node.js API** that accepts tax submissions, queues them via **RabbitMQ**, and processes them asynchronously.  
Fully **Dockerized**, with **Swagger UI**, **retry logic**, **health checks**, and **clean architecture**.

---

## Features

| Feature                                  | Status |
| ---------------------------------------- | ------ |
| Express.js API (`POST /submit`)          | Done   |
| RabbitMQ Queue (`taxSubmissions`)        | Done   |
| Async Processing (Subscriber)            | Done   |
| Swagger UI (`/api-docs`)                 | Done   |
| Docker + Docker Compose                  | Done   |
| Auto-retry on RabbitMQ startup           | Done   |
| Health Checks                            | Done   |
| Graceful Shutdown                        | Done   |
| Management UI (`http://localhost:15672`) | Done   |

---

## Project Structure

```
rabbitmq-tutorial/
├── Dockerfile
├── docker-compose.yml
├── swagger.yaml              ← OpenAPI spec
├── package.json
├── start.js                  ← Entry point (forks API + subscriber)
├── subscriber.js             ← Worker that consumes queue
└── src/
    ├── api.js                ← Express server + Swagger
    ├── rabbitmq.js           ← RabbitMQBuilder with retry
    └── publisher.js          ← publishTaxSubmission()
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourname/rabbitmq-tutorial.git
cd rabbitmq-tutorial
npm ci
```

### 2. Run with Docker (Recommended)

```bash
docker compose up --build
```

> **All services start in one command**  
> API: `http://localhost:3000`  
> Swagger: `http://localhost:3000/api-docs`  
> RabbitMQ UI: `http://localhost:15672` (guest/guest)

---

## Test the API

```bash
curl -X POST http://localhost:3000/submit \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "taxData": "base64-or-json-tax-file"
  }'
```

**Response:**

```json
{
  "message": "Submission received",
  "confirmation": "a1b2c3d4-..."
}
```

**Subscriber logs after ~3s:**

```
[Subscriber] Processing: a1b2c3d4-... for user-123
[Subscriber] Done: a1b2c3d4-...
```

---

## Endpoints

| Method | URL         | Description     |
| ------ | ----------- | --------------- |
| `POST` | `/submit`   | Submit tax data |
| `GET`  | `/api-docs` | Swagger UI      |
| `GET`  | `/health`   | Health check    |

---

## Health Check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "healthy", "rabbitmq": "connected" }
```

---

## RabbitMQ Management

- **URL**: [http://localhost:15672](http://localhost:15672)
- **Credentials**: `guest` / `guest`
- **Queue**: `taxSubmissions` (durable)

---

## Local Development (without Docker)

```bash
# Start RabbitMQ (Docker)
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Start API + Subscriber
node start.js
```

> Ensure `RABBITMQ_URL=amqp://localhost:5672` in `.env` or environment.

---

## Docker Compose Commands

```bash
# Start
docker compose up --build

# Stop
docker compose down

# Clean (remove volumes)
docker compose down -v

# View logs
docker compose logs -f api
```

---

## Environment Variables

| Variable       | Default                | Description         |
| -------------- | ---------------------- | ------------------- |
| `PORT`         | `3000`                 | API port            |
| `RABBITMQ_URL` | `amqp://rabbitmq:5672` | RabbitMQ connection |

---

## Swagger UI

Open: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

- Try `POST /submit`
- See request/response schemas
- Download OpenAPI spec

---

## Graceful Shutdown

Supports `SIGTERM` and `SIGINT`:

- Closes RabbitMQ connection
- Drains in-flight messages
- Exits cleanly

---

## Troubleshooting

| Issue                     | Fix                                   |
| ------------------------- | ------------------------------------- |
| `ENOENT: ../swagger.yaml` | Use `/app/swagger.yaml` in `api.js`   |
| `ECONNREFUSED`            | Retry logic auto-handles it           |
| `No operations in spec`   | Ensure `swagger.yaml` is copied       |
| Container exits           | Check logs: `docker compose logs api` |

---

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/xyz`)
3. Commit (`git commit -am 'Add xyz'`)
4. Push (`git push origin feature/xyz`)
5. Open a Pull Request

---

## License

MIT © Your Name

---

**Built with love, Docker, and RabbitMQ**  
_Now go submit some taxes!_
