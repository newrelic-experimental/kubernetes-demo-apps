const newrelic = require('newrelic');
const redis = require('redis');
const amqp = require('amqplib');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

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
var notifyThirdParty = function() {
  logger.info('Contacting 3rd-party...');
  // Fail 1 out of 10 requests
  var failRate = 10;
  var fail = Math.floor(Math.random() * failRate) === 1;
  var options = {
    host: 'www.random.org',
    path: '/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
  };
  if (fail) {
    options.path = '/floats/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new';
  }
  
  callback = function(response) {
    if (response.statusCode >= 400) {
      newrelic.noticeError('Error third-party, code: ' + response.statusCode);
      throw new Error('Error third-party, code: ' + response.statusCode);
    } else {
      logger.info('Third-party request successfull');
    }
    // Ignore the response
    // var str = '';
  
    // response.on('data', function (chunk) {
    //   str += chunk;
    // });
  
    // response.on('end', function () {
    //   console.log(str);
    // });
  }
  
  http.request(options, callback).end();
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
