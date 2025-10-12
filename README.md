# RabbitMQ Sample

This project demonstrates a scalable RabbitMQ setup simulating a high-load scenario (e.g., tax day submissions). It uses an Express.js API to accept tax submissions via a POST `/submit` endpoint, sending them to a durable RabbitMQ queue (`taxSubmissions`) with persistent messages. The API returns unique confirmation numbers instantly, while a background subscriber processes submissions asynchronously with a 3-second delay per message. Swagger API documentation is provided for easy endpoint exploration and testing.

## Features

- **Express API**: Handles POST requests at `/submit`, enqueuing tax submissions and returning confirmation numbers.
- **RabbitMQ Integration**: Uses a durable queue with persistent messages to ensure reliability across restarts.
- **Modular Design**: Separates concerns into `app.js` (API), `rabbitmq.js` (connection management with Builder Pattern), and `publisher.js` (message publishing).
- **Swagger Docs**: Interactive API documentation at `http://localhost:3000/api-docs` for testing the `/submit` endpoint.
- **Single Command Execution**: Run both API and subscriber with `npm start` using `start.js`.

## Prerequisites

- **Node.js**: v14 or higher (tested with v18.20.8).
- **RabbitMQ**: Running locally (e.g., via Docker: `docker run -d --name rabbitmq -p 127.0.0.1:5672:5672 rabbitmq`).
- **Dependencies**: Install via:
  ```bash
  npm install
  ```

## Project Structure

- `src/app.js`: Express API with `/submit` endpoint and Swagger UI at `/api-docs`.
- `src/rabbitmq.js`: RabbitMQ connection and channel management using the Builder Pattern.
- `src/publisher.js`: Publishes tax submissions to the `taxSubmissions` queue.
- `subscriber.js`: Consumes and processes queue messages sequentially (3-second delay).
- `start.js`: Runs both API and subscriber concurrently.
- `.env`: Configuration for `RABBITMQ_URL` and `PORT`.
- `package.json`: Defines dependencies and scripts.

## Setup

1. **Start RabbitMQ**:

   ```bash
   docker run -d --name rabbitmq -p 127.0.0.1:5672:5672 rabbitmq
   ```

   Or, if installed locally:

   ```bash
   sudo service rabbitmq-server start
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create `.env` in the project root:

   ```bash
   echo "RABBITMQ_URL=amqp://localhost" > .env
   echo "PORT=3000" >> .env
   ```

4. **Save Code Files**:
   Ensure `src/app.js`, `src/rabbitmq.js`, `src/publisher.js`, `subscriber.js`, `start.js`, and `package.json` are in place (see project repository or implementation details).

## Usage

This project simulates a tax submission system where users send tax files via an API, receive instant confirmation numbers, and a background worker processes submissions asynchronously.

### Running the Application

Run both the API and subscriber with a single command:

```bash
npm start
```

Output:

```
Started Express API and RabbitMQ Subscriber
[API]: Connected to RabbitMQ at amqp://localhost
[API]: Express API running on port 3000
[Subscriber]: Waiting for tax submissions...
```

Alternatively:

- Run only the API:
  ```bash
  npm run start:api
  ```
- Run only the subscriber:
  ```bash
  npm run start:subscriber
  ```

### Accessing Swagger API Docs

- Open `http://localhost:3000/api-docs` in a browser to view interactive Swagger UI.
- Use the "Try it out" feature to test the POST `/submit` endpoint with a sample request:
  ```json
  {
    "userId": "user-1",
    "taxData": "Fake tax file"
  }
  ```

### Testing the API

Send a POST request to submit a tax file:

```bash
curl -X POST http://localhost:3000/submit -H "Content-Type: application/json" -d '{"userId":"user-1","taxData":"Fake tax file"}'
```

Response (immediate):

```json
{
  "message": "Submission received",
  "confirmation": "abc123-4567-8901-2345-678901234567"
}
```

Subscriber output (every 3 seconds):

```
[Subscriber]: Processing tax submission: abc123... for user-1
[Subscriber]: Processed tax submission: abc123... - Results ready!
```

Simulate multiple submissions:

```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/submit -H "Content-Type: application/json" -d "{\"userId\":\"user-$i\",\"taxData\":\"Fake tax file $i\"}"
done
```

## Code Details

- **app.js**: Defines the Express API with a `/submit` endpoint, integrates Swagger UI, and initializes RabbitMQ via the builder.
- **rabbitmq.js**: Uses the Builder Pattern for flexible RabbitMQ configuration, with retry logic for robust connections.
- **publisher.js**: Sends tax submissions to the `taxSubmissions` queue with unique confirmation numbers.
- **subscriber.js**: Processes messages one at a time with a 3-second delay, ensuring sequential processing.
- **start.js**: Spawns API and subscriber processes concurrently with retry logic.

## Testing the Simulation

1. Start RabbitMQ.
2. Run `npm start`.
3. Send POST requests via `curl`, Swagger UI, or a test script (e.g., `test.js`).
4. Verify:
   - API returns confirmations instantly.
   - Subscriber processes one message every 3 seconds.
5. Test persistence:
   - Send submissions, stop RabbitMQ (`docker stop rabbitmq`), restart it, and run `npm run start:subscriber` to process queued messages.

## Scaling for Real-Life

- **More Submissions**: Use a test script to send thousands of requests (e.g., modify `test.js`).
- **Multiple Workers**: Run additional `subscriber.js` instances for parallel processing (loses sequential output).
- **Monitoring**: Enable RabbitMQ management UI:
  ```bash
  docker exec rabbitmq rabbitmq-plugins enable rabbitmq_management
  ```
  Visit `http://localhost:15672` (user: `guest`, password: `guest`) to monitor queue length.

## Troubleshooting

- **RabbitMQ Connection Errors**:
  - Ensure RabbitMQ is running (`docker ps` or `sudo service rabbitmq-server status`).
  - Verify `.env` has `RABBITMQ_URL=amqp://localhost` or `amqp://127.0.0.1:5672`.
  - Test connectivity: `telnet 127.0.0.1 5672`.
- **Swagger UI Issues**:
  - If `http://localhost:3000/api-docs` shows "No operations defined in spec!", check console for `Swagger Spec` output to verify `/submit` inclusion.
  - Ensure `swagger-ui-express` and `swagger-jsdoc` are installed (`npm list swagger-ui-express swagger-jsdoc`).
- **Dependencies**:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Notes

- Messages persist due to `durable: true` and `persistent: true`.
- For production, secure `/api-docs` with authentication and add rate limiting (e.g., using `express-rate-limit`).
- Extend with a reply queue for processing results or a `/status` endpoint for submission
