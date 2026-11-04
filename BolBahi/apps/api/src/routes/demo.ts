import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { seedDemoDataForShop } from '../services/seed.js';

export const demoRouter = Router();

// POST /api/demo/seed
demoRouter.post('/seed', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.shopId!;
    const result = await seedDemoDataForShop(shopId);

    res.json({
      ok: true,
      data: {
        message: 'Demo data seeded successfully for this shop',
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
});

