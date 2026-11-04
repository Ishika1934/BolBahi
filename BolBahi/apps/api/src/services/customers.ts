import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Entry } from '../models/Entry.js';
import { notFoundError } from '../lib/errors.js';

export async function listCustomers(shopId: string, query?: string) {
  const sId = new Types.ObjectId(shopId);
  const filter: any = { shopId: sId, archivedAt: null };

  if (query && query.trim()) {
    const q = query.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { aliases: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];
  }

  const customers = await Customer.find(filter).sort({ balance: -1, name: 1 });
  return customers.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    aliases: c.aliases,
    phone: c.phone,
    email: c.email,
    balance: c.balance,
    createdAt: c.createdAt,
  }));
}

export async function getCustomerLedger(shopId: string, customerId: string) {
  const sId = new Types.ObjectId(shopId);
  const cId = new Types.ObjectId(customerId);

  const customer = await Customer.findOne({ _id: cId, shopId: sId, archivedAt: null });
  if (!customer) {
    throw notFoundError('Customer');
  }

  const entries = await Entry.find({
    shopId: sId,
    customerId: cId,
    deletedAt: null,
  }).sort({ createdAt: -1 });

  return {
    customer: {
      id: customer._id.toString(),
      name: customer.name,
      aliases: customer.aliases,
      phone: customer.phone,
      email: customer.email,
      balance: customer.balance,
    },
    entries: entries.map((e) => ({
      id: e._id.toString(),
      type: e.type,
      amount: e.amount,
      note: e.note,
      groupId: e.groupId,
      createdAt: e.createdAt,
    })),
  };
}

