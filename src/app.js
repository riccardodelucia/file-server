require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');

const router = require('./routes');
const globalErrorHandler = require('./controllers/errorController');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Env vars
const environment = process.env.NODE_ENV;
const build = process.env.BUILD;
const version = process.env.VERSION;
const corsOrigins = process.env.CORS_ORIGINS_FILESERVER?.split(', ') || '';
const corsMethods = process.env.CORS_METHODS_FILESERVER?.split(', ') || '';
const JSONSizeLimit = process.env.JSON_SIZE_LIMIT;
const uploadMaxFileSize = process.env.UPLOAD_MAX_FILE_SIZE;
const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS;
const rateLimitWindowMs = process.env.RATE_LIMIT_WINDOW_MS;

// App
const app = express();

if (environment === 'development') {
  logger.info('DEV environment');
  app.use(morgan('dev'));
  app.use(cors());
} else if (environment === 'production') {
  app.enable('trust proxy');
  logger.info('PROD environment');
  app.use(morgan('combined'));
  app.use(
    cors({
      origin: corsOrigins,
      methods: corsMethods,
    })
  );
} else throw new Error(`Wrong ENV_VAR value: ${environment}`);

const limiter = rateLimit({
  max: rateLimitMaxRequests,
  windowMs: rateLimitWindowMs,
  message: 'Too many requests from this IP, please try again in one hour.',
});
app.use(limiter);

app.use(helmet());

app.use(express.json({ limit: JSONSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: uploadMaxFileSize })); //max allowed file upload size
app.use(xss());

app.use(hpp()); //no query parameters allowed so far

app.delete('/upload', (req, res) => {
  res.status(204);
});

// Routes
app.use('/upload', router);

app.get('/', (req, res) => {
  res.json({ build, version });
});

// General error handler to respond upon any error occurred during a request processing
// Crytical error fields (like stack trace) are filtered by sending back a derived object from the exception with desired fields only
app.use(globalErrorHandler);

module.exports = app;
