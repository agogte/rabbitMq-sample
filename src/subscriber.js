const amqp = require("amqplib/callback_api");

amqp.connect(`amqp://localhost`, (err, connection) => {
  if (err) throw err;

  connection.createChannel((err, channel) => {
    if (err) throw err;

    let queueName = "taxSubmissions";
    channel.assertQueue(queueName, {
      durable: true,
    });

    channel.prefetch(1);

    channel.consume(
      queueName,
      (message) => {
        let messageContent = JSON.parse(message.content.toString());
        console.log(
          `Processing tax submission: ${messageContent.confirmation} for ${messageContent.userId}`
        );

        //Simulate async processing (tax calculation delay)
        setTimeout(() => {
          console.log(
            `Processed tax submission: ${messageContent.confirmation} - Results ready!!`
          );
          channel.ack(message);
        }, 3000);
      },
      { noAck: false }
    );
  });
});
