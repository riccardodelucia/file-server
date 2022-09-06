const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const jose = require('jose');
const NodeCache = require('node-cache');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const authJWKSUri = process.env.URL_AUTH_JWKS;

const x509Cache = new NodeCache({ stdTTL: 60, checkperiod: 70 });

const audience = process.env.AUTH_TOKEN_AUDIENCE;

const retrieveX509Certificate = async () => {
  logger.info(`Retrieving x509 certificate from cache`);

  let x509 = x509Cache.get('x509');
  if (x509 == undefined) {
    logger.warn(`x509 cache miss. Reading from server`);
    const res = await axios.get(authJWKSUri);
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

const getTokenFromRequestHeader = (req, next) => {
  logger.info(`Protect middleware: getting token from request`);

  let jwt;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    jwt = req.headers.authorization.split(' ')[1];
  }

  if (!jwt) {
    next(new AppError('No valid token in the Request Header', 401));
  }

  logger.info(`Protect middleware: token retrieved`);

  return jwt;
};

const getPublicKey = async () => {
  logger.info(`Getting public key for validating token`);
  const x509 = await retrieveX509Certificate();
  return jose.importX509(x509.cert, x509.alg);
};

exports.protect = catchAsync(async (req, res, next) => {
  logger.info(`Protect middleware called`);

  const jwt = getTokenFromRequestHeader(req, next);

  const publicKey = await getPublicKey();

  logger.info(`Verifying token with public key`);

  const { payload } = await jose.jwtVerify(jwt, publicKey, {
    audience,
  });

  logger.info(`User '${payload?.preferred_username}' authorized`);

  next();
});
