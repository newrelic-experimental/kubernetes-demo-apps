const newrelic = require('newrelic');
const redis = require('redis');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const querystring = require('querystring');

// Add Winston logging for logs in context
var winston = require('winston'),
    expressWinston = require('express-winston');
const newrelicFormatter = require('@newrelic/winston-enricher')

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const redisHost = process.env.GET_HOSTS_ENV !== 'env' ? 'redis-master' : process.env.REDIS_MASTER_SERVICE_HOST;
const client = redis.createClient({ host: redisHost, port: 6379 });
app.set('view engine', 'pug');
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
  const end = Date.now() + 500;
  while (Date.now() < end) {
    const doSomethingHeavyInJavaScript = 1 + 2 + 3;
  }
};

// Throws an error 10% of the time
var maybeError = function() {
  var throwError = Math.floor(Math.random() * 10) === 1;
  if (throwError) {
    throw new Error('Error 500--Internal Server Error--' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME);
  }
}

// Look busy functionality
app.use(function(req, res, next) {
  if (process.env.LOOK_BUSY == 't') {
    logger.log('looking busy ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME)
    lookBusy();
  }

  next();
});

app.get('/', function (req, res) {
  if (process.env.THROW_ERROR == 't') {
    try {
      maybeError();
    } catch (e) {
      logger.error('Frontend ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME + ': error: ', e);
      newrelic.noticeError(e);
      return res.status(500).send(e.toString());
    }
  }

  res.render('index', { title: 'New Relic K8s Guestbook', message: 'Send a string to our parser service. ' });
});

app.get('/message', function (req, res) {
  logger.info('redis', { message: 'Get messages from Redis' });
  client.get('message', function(err, reply) {
    if (err) {
      logger.error('error: ', e);
      newrelic.noticeError(e);
      return e;
    }
    return res.send(reply);
  });
});

app.post('/message', function(req, res) {
  var message = req.body.message;

  logger.info('Received ' + message);

  const options = {
    hostname: 'parser',
    port: 80,
    path: '/?message=' + querystring.escape(message),
    method: 'GET'
  }

  logger.info('Forwarding to parser service');
  const request = http.request(options, (res) => {
    res.on('data', (d) => {
      logger.info('Answer received, done', d);
    })
  });
  request.on('error', (error) => {
    logger.error('GET Error', d);
  })
  request.end()

  res.redirect('/');
});

app.get('/healthz', function (req, res) {
  // Fail 1 out of 10 requests
  var failRate = 10;
  var fail = Math.floor(Math.random() * failRate) === 1;
  if (fail) {
    logger.error('Error - Unsupported USER_AGENT');
    res.status(500).send('FAILED');
  } else {
    res.status(200).send('OK');
  }
});

app.listen(process.env.PORT || 3000, function () {
  logger.error('Frontend ' + process.env.NEW_RELIC_METADATA_KUBERNETES_POD_NAME + ' listening on port 3000!');
});

client.on('error', function(err) {
  logger.error('Frontend: Could not connect to redis host:', err);
  newrelic.noticeError(err);
})
