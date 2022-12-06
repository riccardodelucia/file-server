import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';

import uploadRouter from './routes/uploadRouter.js';
import downloadRouter from './routes/downloadRouter.js';

import errorController from './controllers/errorController.js';

import config from './config.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Env vars
const {
  NODE_ENV,
  BUILD,
  VERSION,
  CORS_ORIGINS,
  CORS_METHODS,
  JSON_SIZE_LIMIT,
  UPLOAD_MAX_FILE_SIZE,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} = config;

// App
const app = express();

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (NODE_ENV === 'production') {
  app.enable('trust proxy');
  app.use(morgan('combined'));
} else throw new Error(`Wrong ENV_VAR value: ${NODE_ENV}`);

logger.info(`NODE_ENV: ${NODE_ENV}`);

app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: CORS_METHODS,
  })
);

const ms2TimeString = (ms) => {
  const seconds = Math.floor(ms / 1000);

  const hours = Math.floor(seconds / 3600);
  const remainderHours = seconds % 3600;
  const minutes = Math.floor(remainderHours / 60);
  const remainderMinutes = remainderHours % 60;

  return `${hours} ${hours > 1 || hours === 0 ? 'hours' : 'hour'}, ${minutes} ${
    minutes > 1 || minutes === 0 ? 'minutes' : 'minute'
  }, ${remainderMinutes} ${
    remainderMinutes > 1 || remainderMinutes === 0 ? 'seconds' : 'second'
  }`;
};

const limiter = rateLimit({
  max: RATE_LIMIT_MAX_REQUESTS,
  windowMs: RATE_LIMIT_WINDOW_MS,
  message: `Too many requests from this IP, please try again in ${ms2TimeString(
    RATE_LIMIT_WINDOW_MS
  )}`,
});

app.use(limiter);

app.use(helmet());

app.use(express.json({ limit: JSON_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: UPLOAD_MAX_FILE_SIZE })); //max allowed file upload size and built-in body parser
app.use(xss());

app.use(hpp());

// Routes
app.use('/upload', uploadRouter);
app.use('/download', downloadRouter);

app.get('/release', (req, res) => {
  res.json({ build: BUILD, version: VERSION });
});

app.use(errorController.globalErrorMiddleware);

export default app;
