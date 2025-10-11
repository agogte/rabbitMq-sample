const amqp = require("amqplib/callback_api");

// Wrap in async IIFE to use dynamic import
(async () => {
  const { v4: uuidv4 } = await import("uuid"); // Change: Dynamic import for ESM uuid

  amqp.connect(`amqp://localhost`, (err, connection) => {
    if (err) throw err;

    connection.createChannel((err, channel) => {
      if (err) throw err;

      let queueName = "taxSubmissions";
      channel.assertQueue(queueName, { durable: true });

      // Simulate multiple submissions (e.g., 5 for testing; scale up for "300M")
      for (let i = 1; i <= 5; i++) {
        let confirmationNumber = uuidv4(); // Generate unique ID
        let message = JSON.stringify({
          confirmation: confirmationNumber,
          userId: `user-${i}`,
          taxData: `Fake tax file for user ${i}`,
        });

        channel.sendToQueue(queueName, Buffer.from(message), {
          persistent: true,
        });

        // Immediately "return" confirmation (in real API, send HTTP response)
        console.log(
          `Submission received! Your confirmation number: ${confirmationNumber}`
        );
      }

      setTimeout(() => {
        connection.close();
      }, 1000);
    });
  });
})();
