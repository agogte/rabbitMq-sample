async function publishTaxSubmission(userId, taxData, rabbitMQ) {
  try {
    const { v4: uuidv4 } = await import("uuid"); // Dynamic import for ESM
    const channel = await rabbitMQ.getChannel();
    const QUEUE_NAME = "taxSubmissions";

    const confirmationNumber = uuidv4();
    const message = JSON.stringify({
      confirmation: confirmationNumber,
      userId,
      taxData,
    });

    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), { persistent: true });
    console.log(`Submission sent to queue: ${confirmationNumber}`);
    return confirmationNumber;
  } catch (error) {
    console.error("Error publishing to queue:", error.message);
    throw new Error("Failed to publish tax submission");
  }
}

module.exports = { publishTaxSubmission };
