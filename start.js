const { fork } = require("child_process");
const path = require("path");

console.log("Starting Express API and RabbitMQ Subscriber...");

const api = fork(path.join(__dirname, "src", "api.js"));
const subscriber = fork(path.join(__dirname, "subscriber.js"));

api.on("exit", (code) => {
  console.log(`[API] Exited with code ${code}`);
  process.exit(code);
});

subscriber.on("exit", (code) => {
  console.log(`[Subscriber] Exited with code ${code}`);
  process.exit(code);
});
