'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const Busboy = require('busboy');
const { default: PQueue } = require('p-queue');
const { multipartUpload } = require('./s3');

const { publish } = require('./publisher');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

const uploadStatus = {
  UPLOADED: 'uploaded',
  ERROR: 'error',
};

const environment = process.env.NODE_ENV;
const build = process.env.BUILD;
const version = process.env.VERSION;
const corsOrigins = process.env?.CORS_ORIGINS_FILESERVER.split(', ') || '';
const corsMethods = process.env?.CORS_METHODS_FILESERVER.split(', ') || '';

// App
const app = express();

app.enable('trust proxy');

if (environment === 'development') {
  logger.info('DEV environment');
  app.use(morgan('dev'));
  app.use(cors());
} else if (environment === 'production') {
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
  max: 200,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in one hour.',
});
app.use(limiter);

app.use(helmet());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '20GB' })); //max allowed file upload size
app.use(xss());

app.use(hpp()); //no query parameters allowed so far

app.delete('/upload', (req, res) => {
  res.status(204);
});

app.post('/upload', async (req, res) => {
  const uploadId = req.headers['x-upload-id'];

  if (!uploadId) {
    console.log('Missing Upload Id');
    return res.status(400).json({ message: 'Missing "X-Upload-Id" header' });
  }

  // check: https://stackoverflow.com/questions/63632422/express-js-how-handle-errors-with-busboy

  const info = {};
  let filename = undefined;
  let objectKey = undefined;

  const busboy = Busboy({ headers: req.headers });
  const workQueue = new PQueue({ concurrency: 1 });

  async function abort(e, code = 500) {
    logger.warning(`Aborting connection`);

    req.unpipe(busboy);
    workQueue.pause();
    try {
      await publish(uploadStatus.ERROR, uploadId, filename, objectKey, info);
    } catch (error) {
      console.error('Unable to send message to the subscriber: ', error);
    } finally {
      res.status(code);
      res.send(e?.message);
    }
  }

  async function handleError(fn) {
    workQueue.add(async () => {
      try {
        await fn();
      } catch (e) {
        await abort(e);
      }
    });
  }

  busboy.on('file', (_, file, fileInfo) => {
    handleError(async () => {
      filename = fileInfo.filename;
      const date = String(Date.now());
      objectKey = [uploadId, date, filename].join('/');
      await multipartUpload(file, objectKey);
    });
  });

  busboy.on('field', (name, val) => {
    handleError(async () => {
      // storing all form fields inside an info object allows to avoid clashes with publisher reserved message fields
      info[name] = val;
    });
  });

  busboy.on('finish', async () => {
    handleError(async () => {
      await publish(uploadStatus.UPLOADED, uploadId, filename, objectKey, info);
      res.sendStatus(200);
    });
  });

  req.on('aborted', () => {
    abort(new Error('Connection aborted'), 499);
  });

  busboy.on('error', (e) => {
    abort(e);
  });

  req.pipe(busboy);
});

app.get('/', (req, res) => {
  res.json({ build, version });
});

app.listen(PORT, HOST);
logger.info(`Running on http://${HOST}:${PORT}`);
