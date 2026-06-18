const express = require("express");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yamljs");
const { RabbitMQBuilder } = require("./rabbitmq");
const { publishTaxSubmission } = require("./publisher");
const { HttpStatusCode } = require("axios");

dotenv.config({ quiet: true });

const app = express();
app.use(express.json());

// // Swagger configuration
// const swaggerOptions = {
//   definition: {
//     openapi: "3.0.0",
//     info: {
//       title: "Tax Submission API",
//       version: "1.0.0",
//       description: "API for submitting tax files to a RabbitMQ queue",
//     },
//     servers: [
//       {
//         url: `http://localhost:${process.env.PORT || 3000}`,
//         description: "Local server",
//       },
//     ],
//   },
//   apis: [__filename],
// };

const swaggerDoc = yaml.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

const rabbitMQ = new RabbitMQBuilder()
  .withUrl(process.env.RABBITMQ_URL)
  .withQueue("taxSubmissions", { durable: true })
  .withDeadLetter({
    exchange: "taxSubmissions.dlx",
    routingKey: "taxSubmissions.failed",
    queue: "taxSubmissions.dlq",
  })
  .build();

app.get("/health", (req, res) => {
  const connected = Boolean(rabbitMQ.channel);
  res
    .status(connected ? HttpStatusCode.Ok : HttpStatusCode.ServiceUnavailable)
    .json({ status: connected ? "healthy" : "unhealthy", rabbitmq: connected ? "connected" : "disconnected" });
});

app.post("/submit", async (req, res, next) => {
  const { userId, taxData, simulateFailure } = req.body;

  if (!userId || !taxData) {
    return res
      .status(HttpStatusCode.BadRequest)
      .json({ error: "Missing userId or taxData" });
  }

  try {
    const confirmationNumber = await publishTaxSubmission(
      userId,
      taxData,
      rabbitMQ,
      { simulateFailure: Boolean(simulateFailure) }
    );
    res.status(HttpStatusCode.Accepted).json({
      message: "Submission received",
      confirmation: confirmationNumber,
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res
    .status(HttpStatusCode.InternalServerError)
    .json({ error: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 3000;
async function startServer() {
  try {
    await rabbitMQ.connectWithRetry({
      retries: 5,
      delayMs: 3000,
    });
    console.log("[RabbitMQ] Connected - API is ready");
    app.listen(PORT, () => console.log(`Express API running on port ${PORT}`));
  } catch (err) {
    console.error("[FATAL] Could not connect to RabbitMQ after retries", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received – shutting down...");
  if (rabbitMQ.channel) await rabbitMQ.close();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("SIGINT received – shutting down...");
  if (rabbitMQ.channel) await rabbitMQ.close();
  process.exit(0);
});

startServer();
