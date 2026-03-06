const amqp = require("amqplib");

const exchange = "cloudcommercx.events";
let channel;

async function getChannel() {
  if (channel) {
    return channel;
  }
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    return null;
  }
  const conn = await amqp.connect(rabbitUrl);
  channel = await conn.createChannel();
  await channel.assertExchange(exchange, "topic", { durable: false });
  return channel;
}

async function publish(topic, payload) {
  const ch = await getChannel();
  if (!ch) {
    return false;
  }
  ch.publish(exchange, topic, Buffer.from(JSON.stringify(payload)));
  return true;
}

async function subscribe(topic, onMessage) {
  const ch = await getChannel();
  if (!ch) {
    return false;
  }
  const queue = await ch.assertQueue("", { exclusive: true });
  await ch.bindQueue(queue.queue, exchange, topic);
  ch.consume(queue.queue, (msg) => {
    if (!msg) {
      return;
    }
    try {
      const data = JSON.parse(msg.content.toString());
      onMessage(data, msg.fields.routingKey);
      ch.ack(msg);
    } catch (err) {
      ch.nack(msg, false, false);
    }
  });
  return true;
}

module.exports = { publish, subscribe };
