const newrelic = require('newrelic');
var amqp = require('amqplib');
const express = require('express');
const bodyParser = require('body-parser');

// Add Winston logging for logs in context
var winston = require('winston'),
    expressWinston = require('express-winston');
const newrelicFormatter = require('@newrelic/winston-enricher')

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
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
  const end = Date.now() + 100;
  while (Date.now() < end) {
    const doSomethingHeavyInJavaScript = 1 + 2 + 3;
  }
};

var pushToQueue = function(message, res) {
  lookBusy();

  amqp.connect('amqp://user:bitnami@rabbitmq:5672').then(function(conn) {
    return conn.createChannel().then(function(ch) {
      var q = 'message';
      var ok = ch.assertQueue(q, {durable: false});

      return ok.then(function(_qok) {
        newrelic.addCustomAttribute('msgData', message);
        logger.error('Sending to queue: ' + message);
        ch.sendToQueue(q, Buffer.from(message));

        return ch.close();
      });
    }).finally(function() {
      conn.close();
      res.status(200).send('OK');
    });
  }).catch(logger.error);
}

// Look busy middleware
app.use(function(req, res, next) {
  if (process.env.LOOK_BUSY == 't') {
    logger.log('looking busy ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME)
    lookBusy();
  }

  next();
});

app.get('/healthz', function (req, res) {
  newrelic.setIgnoreTransaction(true);
  res.status(200).send('OK');
});

app.get('/', function(req, res) {
  var message = req.query.message;

  logger.info('Received ' + message);

  pushToQueue(message, res)
});

app.listen(process.env.PORT || 3000, function () {
  logger.error('Parser ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME + ': listening on port 3000!');
});
