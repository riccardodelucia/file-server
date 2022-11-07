import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
//import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';

import uploadRouter from './routes/uploadRouter.js';
import downloadRouter from './routes/downloadRouter.js';

import errorController from './controllers/errorController.js';

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
//const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS;
//const rateLimitWindowMs = process.env.RATE_LIMIT_WINDOW_MS;

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

/* const limiter = rateLimit({
  max: rateLimitMaxRequests,
  windowMs: rateLimitWindowMs,
  message: 'Too many requests from this IP, please try again in one hour.',
}); */
//app.use(limiter);

app.use(helmet());

app.use(express.json({ limit: JSONSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: uploadMaxFileSize })); //max allowed file upload size
app.use(xss());

app.use(hpp()); //no query parameters allowed so far

// Routes
app.use('/upload', uploadRouter);
app.use('/download', downloadRouter);

app.get('/', (req, res) => {
  res.json({ build, version });
});

app.use(errorController.globalErrorMiddleware);

export default app;
