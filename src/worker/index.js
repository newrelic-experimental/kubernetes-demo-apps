const newrelic = require('newrelic');
const redis = require('redis');
const amqp = require('amqplib');
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const querystring = require('querystring');

// Add Winston logging for logs in context
var winston = require('winston'),
    expressWinston = require('express-winston');
const newrelicFormatter = require('@newrelic/winston-enricher')

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const redisHost = process.env.GET_HOSTS_ENV !== 'env' ? 'redis-primary' : process.env.REDIS_MASTER_SERVICE_HOST;

const client = redis.createClient({ host: redisHost, port: 6379 });
app.locals.newrelic = newrelic;

// Enable Wiston logger
app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.json(),
    newrelicFormatter()
  ),
  expressFormat: true,
  colorize: true
}));
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.json(),
    newrelicFormatter()
  ),
});

// Do some heavy calculations
var lookBusy = function() {
  const end = Date.now() + 50;
  while (Date.now() < end) {
    const doSomethingHeavyInJavaScript = 1 + 2 + 3;
  }
};

// Push to Redis
var pushToRedis = function(message) {
  logger.info('Worker pushing to Redis: ' + message);
  client.set('message', message, function(err) {
    if (err) {
      logger.error('Worker ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME + ': Error pushing to Redis');
    }
  });
};

// Request to 3rd-party
async function notifyThirdParty() {
  await notifyRandomOrg();
}

function notifyRandomOrg() {
  return new Promise((resolve, reject) => {
    // Fail 1 out of 10 requests
    var failRate = 10;
    var fail = Math.floor(Math.random() * failRate) === 1;
    const options = {
      host: 'www.random.org',
      port: 80,
      path: '/integers/?' + querystring.escape('num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'),
      method: 'GET'
    };

    if (fail) {
      options.path = '/floats/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new';
      logger.info('Contacting 3rd-party... ' + options.host + options.path);
      newrelic.noticeError('HTTP error ' + options.path);
    } else {
      logger.info('Contacting 3rd-party... ' + options.host + options.path);
    }

    const request = https.request(options, (res) => {
      res.on('data', (d) => {
        if (res.statusCode >= 300) {
          newrelic.noticeError('Error third-party, code: ' + res.statusCode);
          logger.error('Error third-party, code: ' + res.statusCode);
          reject('Error third-party, code: ' + res.statusCode);
        } else {
          logger.info('Third-party request successfull, code: ' + res.statusCode);
          resolve();
        }
      })
    });
    request.on('error', (error) => {
      logger.error('GET Error', error);
      reject(error);
    })
    request.end();
  });
}

var listenToQueue = function() {
  logger.info('Worker ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME + ': start listening to queue');

  amqp.connect('amqp://user:bitnami@rabbitmq:5672').then(function(conn) {
    process.once('SIGINT', function() { conn.close(); });
    return conn.createChannel().then(function(ch) {
      var q = 'message';
      var ok = ch.assertQueue(q, {durable: false});

      ok = ok.then(function(_qok) {
        return ch.consume(q, function(msg) {
          lookBusy();
          var message = msg.content.toString();
          
          pushToRedis(message);

          notifyThirdParty();
        }, {noAck: true});
      });

      return ok.then(function(_consumeOk) {
        logger.info(' [*] Waiting for messages');
      });
    });
  }).catch(logger.error);
}

client.on('error', function(err) {
  logger.error('Worker: Could not connect to redis host:', err);
  newrelic.noticeError(err);
})

listenToQueue();
