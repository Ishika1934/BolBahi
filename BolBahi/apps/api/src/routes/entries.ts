import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Entry } from '../models/Entry.js';
import { Customer } from '../models/Customer.js';

export const entriesRouter = Router();

// GET /api/entries
entriesRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sId = new Types.ObjectId(req.shopId!);
    const { type, customerId, from, to } = req.query;

    const filter: any = { shopId: sId, deletedAt: null };

    if (type && (type === 'udhaar' || type === 'payment')) {
      filter.type = type;
    }

    if (customerId) {
      filter.customerId = new Types.ObjectId(customerId as string);
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) filter.createdAt.$lte = new Date(to as string);
    }

    const entries = await Entry.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    // Get customer names
    const customerIds = [...new Set(entries.map((e) => e.customerId.toString()))];
    const customers = await Customer.find({
      shopId: sId,
      _id: { $in: customerIds.map((id) => new Types.ObjectId(id)) },
    });

    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    const result = entries.map((e) => {
      const cust = customerMap.get(e.customerId.toString());
      return {
        id: e._id.toString(),
        customerId: e.customerId.toString(),
        customerName: cust ? cust.name : 'Unknown Customer',
        customerPhone: cust ? cust.phone : undefined,
        type: e.type,
        amount: e.amount,
        note: e.note,
        groupId: e.groupId,
        createdAt: e.createdAt,
      };
    });

    res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

