const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const apiRouter = require('./routes');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
if (process.env.NODE_ENV !== 'test') {
  app.use(logger('dev'));
}
app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected'
  });
});

app.use('/api/v1', apiRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

// Every error leaves the API as JSON: { "message": "..." }
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = status >= 500 ? 'Server error. Please try again later.' : err.message;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body must contain valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = `Please check these fields: ${Object.keys(err.errors).join(', ')}.`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}.`;
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ message });
});

module.exports = app;
