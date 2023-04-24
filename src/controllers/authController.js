import { catchAsync } from '../utils/catchAsync.js';

import { AppError } from '../utils/appError.js';
import * as jose from 'jose';
import NodeCache from 'node-cache';
import axios from 'axios';
import winston from 'winston';

import config from '../config.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const { AUTH_JWKS_URL, AUTH_TOKEN_AUDIENCE } = config;

const x509Cache = new NodeCache({ stdTTL: 60, checkperiod: 70 });

const retrieveX509Certificate = async () => {
  logger.info(`Retrieving x509 certificate from cache`);

  let x509 = x509Cache.get('x509');
  if (x509 == undefined) {
    logger.warn(`x509 cache miss. Reading from server`);
    const res = await axios.get(AUTH_JWKS_URL);
    const key = res.data.keys.find((key) => key.use === 'sig');
    logger.info(`Got x509 from server`);
    const cert = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
    const alg = key.alg;
    x509 = { alg, cert };
    logger.info(`Setting x509 certiticate in the cache`);
    x509Cache.set('x509', x509);
  }

  return x509;
};

const getTokenFromRequestHeader = (req) => {
  logger.info(`Protect middleware: getting token from request`);

  let jwt;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    jwt = req.headers.authorization.split(' ')[1];
  }

  if (!jwt) {
    throw new AppError('No valid token in the Request Header', 401);
  }

  logger.info(`Protect middleware: token retrieved`);

  return jwt;
};

const getPublicKey = async () => {
  logger.info(`Getting public key for validating token`);
  const x509 = await retrieveX509Certificate();
  return jose.importX509(x509.cert, x509.alg);
};

export default {
  protect: catchAsync(async (req, res, next) => {
    logger.info(`Protect middleware called`);

    const jwt = getTokenFromRequestHeader(req, next);

    const publicKey = await getPublicKey();

    logger.info(`Verifying token with public key`);

    const { payload } = await jose.jwtVerify(jwt, publicKey, {
      audience: AUTH_TOKEN_AUDIENCE,
    });

    logger.info(`User '${payload?.preferred_username}' authorized`);

    res.locals.user = payload?.preferred_username || 'user';

    return next();
  }),
  validateObjectKeyAgainstUser: (req, res, next) => {
    logger.info(`validateObjectKeyAgainstUser middleware called`);
    const objectKey = res.locals.objectKey;
    const user = res.locals.user;

    const parts = objectKey.split('/');

    if (parts[1] !== user)
      return next(
        new AppError(
          `Object key ${objectKey} does not start with username ${user}`,
          403
        )
      );

    return next();
  },
};
