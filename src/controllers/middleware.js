import { AppError } from '../utils/appError.js';

export const checkObjectKeyUser = (req, res, next) => {
  const objectKey = res.locals.objectKey;
  const user = res.locals.user;

  const parts = objectKey.split('/');

  if (parts[1] !== user)
    return next(new AppError('Object key must start with the username', 403));

  return next();
};
