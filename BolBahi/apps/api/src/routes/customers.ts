import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listCustomers, getCustomerLedger } from '../services/customers.js';
import { Customer } from '../models/Customer.js';
import { emitShopEvent } from '../lib/sse.js';

export const customersRouter = Router();

// GET /api/customers
customersRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    const customers = await listCustomers(req.shopId!, q);
    res.json({
      ok: true,
      data: customers,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id/entries
customersRouter.get('/:id/entries', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCustomerLedger(req.shopId!, req.params.id);
    res.json({
      ok: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/customers/:id (edit name, phone, email)
customersRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!customer) {
      res.status(404).json({ ok: false, error: { message: 'Customer not found' } });
      return;
    }

    if (name && name.trim() && name.trim() !== customer.name) {
      if (!customer.aliases.includes(customer.name)) {
        customer.aliases.push(customer.name);
      }
      customer.name = name.trim();
    }
    if (phone !== undefined) customer.phone = phone.trim();
    if (email !== undefined) customer.email = email.trim();

    await customer.save();
    emitShopEvent(req.shopId!, 'ledger.updated', { customerId: customer._id });

    res.json({
      ok: true,
      data: {
        id: customer._id.toString(),
        name: customer.name,
        aliases: customer.aliases,
        phone: customer.phone,
        email: customer.email,
        balance: customer.balance,
      },
    });
  } catch (err) {
    next(err);
  }
});
