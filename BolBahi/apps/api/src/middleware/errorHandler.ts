import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's a typed AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        spokenMessage: err.spokenMessage,
      },
    });
    return;
  }

  // If it's a Zod validation error
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]?.message || 'Invalid input data';
    res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: firstIssue,
        spokenMessage: 'Di gayi jankari sahi nahi hai.',
      },
    });
    return;
  }

  // Unhandled / Internal errors
  console.error('[UnhandledError]', err);
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL',
      message: 'Internal server error',
      spokenMessage: 'Kuch gadbad ho gayi, kripya dobara bolein.',
    },
  });
}

