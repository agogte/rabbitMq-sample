// subscriber.js
// NOTE: Docker copies this file to the repo root (see Dockerfile) and
// start.js forks it from there, so requires must be relative to root.
const { RabbitMQBuilder } = require("./src/rabbitmq");
const { recordAudit, recordFailedMessage } = require("./src/db");

const QUEUE_NAME = "taxSubmissions";
const DLX_NAME = "taxSubmissions.dlx";
const DLQ_ROUTING_KEY = "taxSubmissions.failed";
const DLQ_NAME = "taxSubmissions.dlq";

async function startSubscriber() {
  const rabbitMQ = new RabbitMQBuilder()
    .withUrl(process.env.RABBITMQ_URL || "amqp://rabbitmq:5672")
    .withQueue(QUEUE_NAME, { durable: true })
    .withDeadLetter({ exchange: DLX_NAME, routingKey: DLQ_ROUTING_KEY, queue: DLQ_NAME })
    .build();

  try {
    await rabbitMQ.connectWithRetry({ retries: 15, delayMs: 3000 });
    const channel = rabbitMQ.getChannel();

    console.log("[Subscriber] Waiting for tax submissions...");

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg === null) return;

      const data = JSON.parse(msg.content.toString());
      console.log(
        `[Subscriber] Processing: ${data.confirmation} for ${data.userId}`
      );

      try {
        // Simulate processing
        await new Promise((res) => setTimeout(res, 3000));

        if (data.simulateFailure) {
          throw new Error("Simulated processing failure");
        }

        console.log(`[Subscriber] Done: ${data.confirmation}`);
        recordAudit(data.confirmation, "processed");
        channel.ack(msg);
      } catch (err) {
        console.error(`[Subscriber] Failed: ${data.confirmation}`, err.message);
        recordAudit(data.confirmation, "failed");
        // requeue=false routes the message to the dead-letter exchange
        channel.nack(msg, false, false);
      }
    });

    // Drain the dead-letter queue into the failed_messages audit table
    channel.consume(DLQ_NAME, (msg) => {
      if (msg === null) return;

      let data = {};
      try {
        data = JSON.parse(msg.content.toString());
      } catch {
        // payload wasn't JSON; fall through with empty data
      }

      recordFailedMessage({
        messageId: data.confirmation,
        queue: QUEUE_NAME,
        payload: msg.content.toString(),
        error: "Dead-lettered after processing failure",
      });
      console.log(`[Subscriber] Dead-lettered: ${data.confirmation}`);
      channel.ack(msg);
    });
  } catch (err) {
    console.error("[Subscriber] Fatal error:", err);
    process.exit(1);
  }
}

startSubscriber();
