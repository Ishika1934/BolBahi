import { Request, Response, NextFunction } from 'express';
import { COOKIE_NAME, verifyToken } from '../lib/jwt.js';
import { authRequiredError, authInvalidError } from '../lib/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // Strip any malicious or accidental shopId from client
  if (req.body && typeof req.body === 'object') {
    delete req.body.shopId;
  }
  if (req.query && typeof req.query === 'object') {
    delete (req.query as any).shopId;
  }

  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, '');

  if (!token) {
    return next(authRequiredError());
  }

  try {
    const payload = verifyToken(token);
    if (!payload?.sub || !payload?.shopId) {
      return next(authInvalidError());
    }

    req.auth = {
      userId: payload.sub,
      shopId: payload.shopId,
    };
    req.shopId = payload.shopId;

    next();
  } catch (err) {
    return next(authInvalidError());
  }
}

