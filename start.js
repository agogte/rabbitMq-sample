const { spawn } = require("child_process");
const path = require("path");

// Paths to the API and subscriber scripts
const apiScript = path.join(__dirname, "src", "api.js");
const subscriberScript = path.join(__dirname, "src/subscriber.js");

// Spawn processes for API and subscriber
const apiProcess = spawn("node", [apiScript], {
  stdio: ["inherit", "pipe", "pipe"],
});
const subscriberProcess = spawn("node", [subscriberScript], {
  stdio: ["inherit", "pipe", "pipe"],
});

// Log output from API
apiProcess.stdout.on("data", (data) => {
  console.log(`[API]: ${data.toString().trim()}`);
});
apiProcess.stderr.on("data", (data) => {
  console.error(`[API Error]: ${data.toString().trim()}`);
});

// Log output from Subscriber
subscriberProcess.stdout.on("data", (data) => {
  console.log(`[Subscriber]: ${data.toString().trim()}`);
});
subscriberProcess.stderr.on("data", (data) => {
  console.error(`[Subscriber Error]: ${data.toString().trim()}`);
});

// Handle process exit
apiProcess.on("close", (code) => {
  console.log(`[API]: Exited with code ${code}`);
});
subscriberProcess.on("close", (code) => {
  console.log(`[Subscriber]: Exited with code ${code}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down...");
  apiProcess.kill();
  subscriberProcess.kill();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT. Shutting down...");
  apiProcess.kill();
  subscriberProcess.kill();
  process.exit(0);
});

console.log("Started Express API and RabbitMQ Subscriber");
