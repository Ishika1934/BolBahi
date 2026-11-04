import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { listCustomers, getCustomerLedger } from '../services/customers.js';
import { Customer } from '../models/Customer.js';
import { Entry } from '../models/Entry.js';
import { recomputeCustomerBalance } from '../services/ledger.js';
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

// POST /api/customers (manually add customer with duplicate check)
customersRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, balance, amount } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ ok: false, error: { message: 'Customer name is required' } });
      return;
    }
    const cleanName = name.trim();
    const existing = await Customer.findOne({
      shopId: req.shopId,
      archivedAt: null,
      name: { $regex: `^${cleanName}$`, $options: 'i' },
    });
    if (existing) {
      res.status(400).json({
        ok: false,
        error: {
          code: 'DUPLICATE',
          message: `Customer "${cleanName}" already exists. Please provide more details such as a full name or phone number.`,
          spokenMessage: `Yeh grahak pehle se darj hai. Kripya pura naam ya phone number dalein.`,
        },
      });
      return;
    }

    const customer = await Customer.create({
      shopId: req.shopId,
      name: cleanName,
      aliases: [cleanName],
      phone: phone?.trim() || undefined,
      email: email?.trim() || undefined,
      balance: 0,
    });

    const initialBal = Math.max(0, Math.round(Number(balance ?? amount ?? 0)));
    if (initialBal > 0) {
      await Entry.create({
        shopId: req.shopId,
        customerId: customer._id,
        type: 'udhaar',
        amount: initialBal,
        note: 'Opening balance / शुरुआती हिसाब',
        groupId: `init_cust_${Date.now()}`,
      });
      await recomputeCustomerBalance(req.shopId!, customer._id);
      customer.balance = initialBal;
    }

    emitShopEvent(req.shopId!, 'ledger.updated', { customerId: customer._id });

    res.status(201).json({
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

// PATCH /api/customers/:id (edit name, phone, email, balance/amount)
customersRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, balance, amount } = req.body;
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

    const targetBalance = balance !== undefined ? balance : amount;
    if (targetBalance !== undefined && targetBalance !== null && !isNaN(Number(targetBalance))) {
      const newBal = Math.max(0, Math.round(Number(targetBalance)));
      const diff = newBal - customer.balance;
      if (diff !== 0) {
        const groupId = `manual_adj_${Date.now()}`;
        if (diff > 0) {
          await Entry.create({
            shopId: customer.shopId,
            customerId: customer._id,
            type: 'udhaar',
            amount: diff,
            note: 'Manual balance adjustment / मैनुअल सुधार',
            groupId,
          });
        } else {
          await Entry.create({
            shopId: customer.shopId,
            customerId: customer._id,
            type: 'payment',
            amount: Math.abs(diff),
            note: 'Manual balance adjustment / मैनुअल सुधार',
            groupId,
          });
        }
        await recomputeCustomerBalance(req.shopId!, customer._id);
        customer.balance = newBal;
      }
    }

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
