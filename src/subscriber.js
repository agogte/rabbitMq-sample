// subscriber.js
const { RabbitMQBuilder } = require("./src/rabbitmq");

async function startSubscriber() {
  const rabbitMQ = new RabbitMQBuilder()
    .withUrl(process.env.RABBITMQ_URL || "amqp://rabbitmq:5672")
    .withQueue("taxSubmissions", { durable: true })
    .build();

  try {
    await rabbitMQ.connectWithRetry({ retries: 15, delayMs: 3000 });
    const channel = rabbitMQ.getChannel();

    console.log("[Subscriber] Waiting for tax submissions...");

    channel.consume("taxSubmissions", async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());
        console.log(
          `[Subscriber] Processing: ${data.confirmation} for ${data.userId}`
        );

        // Simulate processing
        await new Promise((res) => setTimeout(res, 3000));

        console.log(`[Subscriber] Done: ${data.confirmation}`);
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error("[Subscriber] Fatal error:", err);
    process.exit(1);
  }
}

startSubscriber();
