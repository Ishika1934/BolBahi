import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { registerUser, loginUser, getCurrentAuth } from '../services/auth.js';
import { setAuthCookie, clearAuthCookie } from '../lib/jwt.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { Shop } from '../models/Shop.js';

export const authRouter = Router();

// Rate limiter: 5 failures per 15 minutes per IP on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: {
      code: 'AUTH_INVALID',
      message: 'Too many login attempts. Please try again later.',
      spokenMessage: 'Thodi der baad try karein.',
    },
  },
});

const registerSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  identifier: z
    .string()
    .min(3, 'Identifier must be an email or 10-digit mobile number')
    .refine(
      (val) => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        const isPhone = /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''));
        return isEmail || isPhone;
      },
      { message: 'Valid email or 10-digit Indian mobile number required' }
    ),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  language: z.enum(['hi-IN', 'en-IN']).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
authRouter.post(
  '/register',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await registerUser(validated);

      setAuthCookie(res, result.token);

      res.status(201).json({
        ok: true,
        data: {
          user: result.user,
          shop: result.shop,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
authRouter.post(
  '/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await loginUser(validated.identifier, validated.password);

      setAuthCookie(res, result.token);

      res.json({
        ok: true,
        data: {
          user: result.user,
          shop: result.shop,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({
    ok: true,
    data: { message: 'Logged out successfully' },
  });
});

// PATCH /api/auth/language
authRouter.patch(
  '/language',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { language } = z.object({ language: z.enum(['hi-IN', 'en-IN']) }).parse(req.body);
      const shop = await Shop.findByIdAndUpdate(req.shopId, { language }, { new: true });
      res.json({
        ok: true,
        data: { language: shop?.language },
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, shopId } = req.auth!;
      const result = await getCurrentAuth(userId, shopId);

      res.json({
        ok: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

