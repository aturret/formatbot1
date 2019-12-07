const amqp = require('amqplib');
const logger = require('../api/utils/logger');

const TASKS_CHANNEL = 'tasks';
const TASKS2_CHANNEL = 'tasks2';
const TASKS3_CHANNEL = 'puppet';
let rchannel = null;
const starts = {
  start: process.hrtime(),
  start2: process.hrtime(),
  start3: process.hrtime(),
};
let availableOne = true;

const getStartName = (q) => {
  let startName = 'start';
  switch (q) {
    case TASKS2_CHANNEL:
      startName = 'start2';
      break;
    case TASKS3_CHANNEL:
      startName = 'start3';
      break;
    default:
      break;
  }
  return startName;
};
const elapsedSec = (q) => {
  const startName = getStartName(q);
  logger(startName);
  return process.hrtime(starts[startName])[0];
};
const elapsedTime = (q = TASKS_CHANNEL) => {
  const startName = getStartName(q);
  let elapsed = process.hrtime(starts[startName])[1] / 1000000;
  elapsed = `${process.hrtime(starts[startName])[0]}s, ${elapsed.toFixed(0)}`;
  return `${elapsed}ms ${q}`;
};
const resetTime = (q = TASKS_CHANNEL) => {
  const startName = getStartName(q);
  logger(`reset ${startName}`);
  starts[startName] = process.hrtime();
};
const createChannel = async (queueName = TASKS_CHANNEL) => {
  let channel;
  try {
    const connection = await amqp.connect(process.env.MESSAGE_QUEUE);
    channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });
  } catch (e) {
    logger(e);
  }
  rchannel = channel;
  return channel;
};

const run = async (job, queueName = TASKS_CHANNEL) => {
  try {
    const channel = await createChannel(queueName);
    await channel.prefetch(1);
    channel.consume(queueName, async (message) => {
      const content = message.content.toString();
      const task = JSON.parse(content);
      if (queueName !== TASKS_CHANNEL) task.q = queueName;
      await job(task);
      channel.ack(message);
    });
  } catch (e) {
    logger(e);
  }
};
const runSecond = job => run(job, TASKS2_CHANNEL);
const runPuppet = job => run(job, TASKS3_CHANNEL);

const getParams = (queueName = TASKS_CHANNEL) => {
  const isPuppet = queueName === TASKS3_CHANNEL;
  let access_token = process.env.TGPHTOKEN;
  if (queueName === TASKS2_CHANNEL) {
    access_token = process.env.TGPHTOKEN2;
  }
  return {
    isPuppet,
    access_token,
  };
};

const addToQueue = async (task, queueName = TASKS_CHANNEL) => {
  if (rchannel) {
    const el = elapsedTime(queueName);
    let elTime = elapsedSec(queueName);
    logger(`availableOne ${availableOne}`);
    logger(`elTime ${elTime}`);
    if (queueName === TASKS_CHANNEL && !availableOne && elTime > 15) {
      queueName = chanSecond();
    }
    logger(el);
    await rchannel.sendToQueue(queueName,
        Buffer.from(JSON.stringify(task)), {
          contentType: 'application/json',
          persistent: true,
        });
  }
};

const isMain = q => !q || q === TASKS_CHANNEL;
const chanSecond = () => TASKS2_CHANNEL;
const chanPuppet = () => TASKS3_CHANNEL;

const time = (queueName = TASKS_CHANNEL, start = false) => {
  if (queueName === TASKS_CHANNEL) {
    availableOne = !start;
  }
  if (!start) {
    resetTime(queueName);
  }
  return elapsedTime(queueName);
};

module.exports.createChannel = createChannel;
module.exports.addToQueue = addToQueue;
module.exports.runSecond = runSecond;
module.exports.runPuppet = runPuppet;

module.exports.isMain = isMain;
module.exports.chanSecond = chanSecond;
module.exports.chanPuppet = chanPuppet;
module.exports.getParams = getParams;
module.exports.time = time;
module.exports.run = run;
