const amqp = require("amqplib/callback_api");
const { v4: uuidv4 } = require("uuid");

amqp.connect(`amqp://localhost`, (err, connection) => {
  if (err) throw err;

  connection.createChannel((err, channel) => {
    if (err) throw err;

    let queueName = "taxSubmission";
    channel.assertQueue(queueName, {
      durable: true,
    });

    for (let i = 0; i < 5; i++) {
      let confirmationNumber = uuidv4();
      let message = JSON.stringify({
        confirmation: confirmationNumber,
        userId: `user-${i + 1}`,
        taxData: `Fake tax file for user ${i + 1}`,
      });
    }

    // Change: Immediately "return" confirmation (in real API, send HTTP response)
    console.log(
      `Submission received! Your confirmation number: ${confirmationNumber}`
    );

    console.log(`message: ${message}`);
    setTimeout(() => {
      connection.close();
    }, 1000);
  });
});
