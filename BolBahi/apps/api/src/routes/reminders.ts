import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Reminder } from '../models/Reminder.js';
import { Customer } from '../models/Customer.js';
import { notFoundError } from '../lib/errors.js';
import { emitShopEvent } from '../lib/sse.js';

export const remindersRouter = Router();

// GET /api/reminders
remindersRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sId = new Types.ObjectId(req.shopId!);
    const reminders = await Reminder.find({ shopId: sId }).sort({ sendAt: -1 }).limit(50);

    const customerIds = [...new Set(reminders.map((r) => r.customerId.toString()))];
    const customers = await Customer.find({
      shopId: sId,
      _id: { $in: customerIds.map((id) => new Types.ObjectId(id)) },
    });
    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    const result = reminders.map((r) => {
      const cust = customerMap.get(r.customerId.toString());
      return {
        id: r._id.toString(),
        customerId: r.customerId.toString(),
        customerName: cust ? cust.name : 'Unknown',
        customerPhone: cust ? cust.phone : undefined,
        customerEmail: cust ? cust.email : undefined,
        message: r.message,
        channel: r.channel,
        sendAt: r.sendAt,
        status: r.status,
        groupId: r.groupId,
        createdAt: r.createdAt,
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

// DELETE /api/reminders/:id
remindersRouter.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sId = new Types.ObjectId(req.shopId!);
    const reminder = await Reminder.findOne({ _id: new Types.ObjectId(req.params.id), shopId: sId });

    if (!reminder) {
      throw notFoundError('Reminder');
    }

    reminder.status = 'cancelled';
    await reminder.save();

    emitShopEvent(req.shopId!, 'reminder.cancelled', { id: reminder._id.toString() });

    res.json({
      ok: true,
      data: {
        id: reminder._id.toString(),
        status: 'cancelled',
      },
    });
  } catch (err) {
    next(err);
  }
});

