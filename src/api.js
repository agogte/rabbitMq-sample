const express = require("express");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path"); // Add this line
const { RabbitMQBuilder } = require("./rabbitmq");
const { publishTaxSubmission } = require("./publisher");

dotenv.config({ quiet: true }); // Suppress dotenv logs

const app = express();
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tax Submission API",
      version: "1.0.0",
      description: "API for submitting tax files to a RabbitMQ queue",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Local server",
      },
    ],
  },
  apis: [path.join(__dirname, "api.js")], // Correct path for api.js
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Initialize RabbitMQ with builder
const rabbitMQ = new RabbitMQBuilder()
  .withUrl(process.env.RABBITMQ_URL)
  .withQueue("taxSubmissions", { durable: true })
  .build();

rabbitMQ.connect().catch((err) => {
  console.error("Failed to initialize RabbitMQ:", err.message);
  process.exit(1);
});

app.post("/submit", async (req, res, next) => {
  const { userId, taxData } = req.body;

  // Input validation
  if (!userId || !taxData) {
    return res.status(400).json({ error: "Missing userId or taxData" });
  }

  try {
    const confirmationNumber = await publishTaxSubmission(
      userId,
      taxData,
      rabbitMQ
    );
    res.status(202).json({
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
  res.status(500).json({ error: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express API running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await rabbitMQ.close();
  process.exit(0);
});
