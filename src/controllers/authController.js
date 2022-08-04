const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const jose = require('jose');
const NodeCache = require('node-cache');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const authJWKSUri = process.env.AUTH_JWKS_URI;

const x509Cache = new NodeCache({ stdTTL: 60, checkperiod: 70 });

const audience = process.env.AUTH_TOKEN_AUDIENCE;

exports.protect = catchAsync(async (req, res, next) => {
  let x509 = x509Cache.get('x509');
  if (x509 == undefined) {
    const res = await axios.get(authJWKSUri);
    const key = res.data.keys.find((key) => key.use === 'sig');
    const cert = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
    const alg = key.alg;
    x509 = { alg, cert };

    x509Cache.set('x509', x509);
  }
  const publicKey = await jose.importX509(x509.cert, x509.alg);

  let jwt;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    jwt = req.headers.authorization.split(' ')[1];
  }

  if (!jwt) {
    return next(new AppError('No valid token in the Request Header', 403));
  }

  const { payload } = await jose.jwtVerify(jwt, publicKey, {
    audience,
  });

  logger.info(`User '${payload?.preferred_username}' authorized`);

  next();
});
