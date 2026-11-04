import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { Response } from 'express';

export interface JwtPayload {
  sub: string; // userId
  shopId: string;
}

export const COOKIE_NAME = 'bb_session';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = env.NODE_ENV === 'production' || env.COOKIE_SECURE;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  const isProduction = env.NODE_ENV === 'production' || env.COOKIE_SECURE;
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
  });
}

