const amqp = require("amqplib/callback_api");

amqp.connect(`amqp://localhost`, (err, connection) => {
  if (err) throw err;

  connection.createChannel((err, channel) => {
    if (err) throw err;

    let queueName = "myFirstQueue";
    channel.assertQueue(queueName, {
      durable: true,
    });

    channel.consume(queueName, (message) => {
      console.log(`Received: ${message.content.toString()}`);
      channel.ack(message);
    });
  });
});
