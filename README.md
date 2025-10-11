# RabbitMQ Sample

This project demonstrates a simple RabbitMQ setup simulating a high-load scenario (e.g., tax day submissions). It uses a durable queue to buffer messages, a publisher to send messages with unique confirmation numbers, and a subscriber to process them sequentially with a 3-second delay per message. The publisher mimics an API accepting submissions instantly, while the subscriber processes them asynchronously, ensuring the system isn't overwhelmed.

## Prerequisites
- **Node.js**: Install Node.js (v14 or higher recommended).
- **RabbitMQ**: Install and run RabbitMQ locally (e.g., via Docker: `docker run -p 5672:5672 rabbitmq`).
- **Dependencies**: Install the required Node.js package:
  ```bash
  npm install amqplib uuid
  ```

## Project Structure
- `publisher.js`: Simulates an API sending tax submissions to a RabbitMQ queue, generating unique confirmation numbers for each.
- `subscriber.js`: Consumes messages from the queue one at a time, processing each with a 3-second delay to simulate tax processing.

## Setup
1. **Start RabbitMQ**:
   ```bash
   docker run -it --rm --name rabbitmq -p 5672:5672 rabbitmq
   ```
   Or install RabbitMQ locally and start it (`sudo service rabbitmq-server start`).

2. **Install Dependencies**:
   In the project directory, run:
   ```bash
   npm install
   ```

3. **Save the Code**:
   - Copy the `publisher.js` and `subscriber.js` files (provided below) into your project directory.
   - Ensure both files use the same queue name (`taxSubmissions`) and connect to `amqp://localhost`.

## Usage
This project simulates a tax day scenario where users submit tax files, receive instant confirmation numbers, and processing happens asynchronously.

### Running the Subscriber
1. Open a terminal and run the subscriber to start processing messages:
   ```bash
   node subscriber.js
   ```
   - It waits for messages in the `taxSubmissions` queue.
   - Processes one message every 3 seconds, printing "Processing..." and "Results ready!".

### Running the Publisher
1. In another terminal, run the publisher to simulate submissions:
   ```bash
   node publisher.js
   ```
   - Sends 5 sample tax submissions to the queue.
   - Prints confirmation numbers immediately for each submission.

### Expected Output
- **Publisher**: Prints all confirmation numbers instantly (e.g., `Submission received! Your confirmation number: abc123-...`).
- **Subscriber**: Processes one message every 3 seconds, showing:
  ```
  Waiting for tax submissions...
  Processing tax submission: abc123... for user-1
  [3s pause]
  Processed tax submission: abc123... - Results ready!
  Processing tax submission: def456... for user-2
  [3s pause]
  Processed tax submission: def456... - Results ready!
  ...
  ```

## Code Details
### publisher.js
Sends messages to a durable queue with persistent messages, ensuring they survive RabbitMQ restarts. Each message includes a unique confirmation number and sample tax data.

### subscriber.js
Consumes messages one at a time (`prefetch(1)`), processes them with a 3-second delay, and acknowledges them. Uses a durable queue for reliability.

## Testing the Simulation
1. Start RabbitMQ.
2. Run one instance of `subscriber.js`.
3. Run `publisher.js` to send 5 messages.
4. Observe instant confirmations from the publisher and sequential processing (every 3 seconds) in the subscriber.
5. To test persistence:
   - Send messages with the publisher.
   - Stop RabbitMQ (`docker stop rabbitmq` or `sudo service rabbitmq-server stop`).
   - Restart RabbitMQ.
   - Run the subscriber—it should process the messages.

## Scaling for Real-Life
- **More Submissions**: Increase the loop in `publisher.js` (e.g., `i <= 1000`) to simulate higher load.
- **Multiple Workers**: Run multiple `subscriber.js` instances for parallel processing (loses strict sequential output).
- **Monitoring**: Use RabbitMQ's management plugin (`rabbitmq-plugins enable rabbitmq_management` and visit `http://localhost:15672`) to monitor queue length.

## Notes
- Ensure RabbitMQ is running on `amqp://localhost`.
- Messages persist due to `durable: true` and `persistent: true`.
- For a real API, integrate `publisher.js` into an HTTP endpoint (e.g., Express.js) to return confirmations to clients.
- To add result notifications, consider a reply queue or database to store processed results.