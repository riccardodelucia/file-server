import winston from 'winston';
import app from './app.js';

import config from './config.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';
const { PROTECTED, PUBLISHER } = config;

logger.info(`Service is protected: ${PROTECTED}`);
logger.info(`Service has publisher configured: ${PUBLISHER}`);

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception! Shutting Down...');
  logger.error(`${err.name} ${err.message}`);
  process.exit(1);
});

const server = app.listen(PORT, HOST);
logger.info(`Running on http://${HOST}:${PORT}`);

process.on('unhadledRejection', (err) => {
  logger.error('Unhandled Rejection! Shutting Down...');
  logger.error(`${err.name} ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
