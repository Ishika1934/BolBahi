import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Entry } from '../models/Entry.js';
import { Reminder } from '../models/Reminder.js';
import { StockItem } from '../models/StockItem.js';
import { ActionLog } from '../models/ActionLog.js';
import { recomputeCustomerBalance } from './ledger.js';

export async function seedDemoDataForShop(shopId: string) {
  const sId = new Types.ObjectId(shopId);

  // 1. Clean existing records for this shop only
  await Promise.all([
    Entry.deleteMany({ shopId: sId }),
    Reminder.deleteMany({ shopId: sId }),
    StockItem.deleteMany({ shopId: sId }),
    Customer.deleteMany({ shopId: sId }),
    ActionLog.deleteMany({ shopId: sId }),
  ]);

  const seedGroupId = `seed_${Date.now()}`;

  // 2. Define 10 Indian customers (including two Sureshes)
  const customersData = [
    {
      name: 'Ramesh Kumar',
      aliases: ['Ramesh'],
      email: 'ramesh@example.com',
      phone: '9811223344',
      entries: [{ type: 'udhaar' as const, amount: 1200, note: 'Pichla bahi khata' }],
    },
    {
      name: 'Sharma ji',
      aliases: ['Sharma', 'Sharma ji'],
      email: 'sharma@example.com',
      phone: '9822334455',
      entries: [
        { type: 'udhaar' as const, amount: 700, note: 'Ration samaan' },
        { type: 'payment' as const, amount: 200, note: 'GPay payment' },
      ],
    },
    {
      name: 'Suresh Gupta',
      aliases: ['Suresh Gupta', 'Gupta Suresh'],
      email: 'suresh.gupta@example.com',
      phone: '9833445566',
      entries: [{ type: 'udhaar' as const, amount: 800, note: 'Tel aur daal' }],
    },
    {
      name: 'Suresh Yadav',
      aliases: ['Suresh Yadav', 'Yadav Suresh'],
      email: 'suresh.yadav@example.com',
      phone: '9844556677',
      entries: [{ type: 'udhaar' as const, amount: 450, note: 'Chai patti aur doodh' }],
    },
    {
      name: 'Mohan Lal',
      aliases: ['Mohan', 'Mohan ji'],
      phone: '9855667788',
      entries: [{ type: 'udhaar' as const, amount: 350, note: 'Ghee' }],
    },
    {
      name: 'Gupta ji',
      aliases: ['Gupta', 'Gupta ji'],
      phone: '9866778899',
      entries: [{ type: 'udhaar' as const, amount: 1500, note: 'Mahine ka hisaab' }],
    },
    {
      name: 'Priya Sharma',
      aliases: ['Priya'],
      phone: '9877889900',
      entries: [
        { type: 'udhaar' as const, amount: 500, note: 'Snacks aur biscuit' },
        { type: 'payment' as const, amount: 300, note: 'Cash jama' },
      ],
    },
    {
      name: 'Amit Verma',
      aliases: ['Amit'],
      phone: '9888990011',
      entries: [
        { type: 'udhaar' as const, amount: 400, note: 'Soap aur shampoo' },
        { type: 'payment' as const, amount: 400, note: 'Poora hisaab barabar' },
      ],
    },
    {
      name: 'Vikram Singh',
      aliases: ['Vikram', 'Singh sahab'],
      phone: '9899001122',
      entries: [{ type: 'udhaar' as const, amount: 750, note: 'Masale aur tel' }],
    },
    {
      name: 'Anita Devi',
      aliases: ['Anita'],
      phone: '9810112233',
      entries: [{ type: 'udhaar' as const, amount: 600, note: 'Rice packet' }],
    },
  ];

  // 3. Create customers and their ledger entries
  const createdCustomers = [];
  for (const c of customersData) {
    const customer = await Customer.create({
      shopId: sId,
      name: c.name,
      aliases: c.aliases,
      phone: c.phone,
      email: c.email,
      balance: 0,
    });

    for (const e of c.entries) {
      await Entry.create({
        shopId: sId,
        customerId: customer._id,
        type: e.type,
        amount: e.amount,
        note: e.note,
        groupId: seedGroupId,
      });
    }

    const updatedBalance = await recomputeCustomerBalance(shopId, customer._id);
    createdCustomers.push({ id: customer._id.toString(), name: customer.name, balance: updatedBalance });
  }

  // 4. Create 2 stock items
  const stockItemsData = [
    { name: 'Atta', quantityHint: '10 kilo', status: 'low' as const },
    { name: 'Chini', quantityHint: '5 kilo', status: 'low' as const },
  ];

  const createdStockItems = [];
  for (const s of stockItemsData) {
    const item = await StockItem.create({
      shopId: sId,
      name: s.name,
      quantityHint: s.quantityHint,
      status: s.status,
      groupId: seedGroupId,
    });
    createdStockItems.push({ id: item._id.toString(), name: item.name, status: item.status });
  }

  // 5. Create sample reminders
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  let reminderCount = 0;
  if (createdCustomers.length >= 2) {
    await Reminder.create({
      shopId: sId,
      customerId: new Types.ObjectId(createdCustomers[0].id),
      message: `${createdCustomers[0].name} ko udhaar wapsi ka tagada`,
      channel: 'email',
      sendAt: tomorrow,
      status: 'pending',
      groupId: seedGroupId,
    });
    await Reminder.create({
      shopId: sId,
      customerId: new Types.ObjectId(createdCustomers[1].id),
      message: `${createdCustomers[1].name} ko bahi khata hisaab reminder`,
      channel: 'email',
      sendAt: tomorrow,
      status: 'pending',
      groupId: seedGroupId,
    });
    reminderCount = 2;
  }

  return {
    customerCount: createdCustomers.length,
    stockCount: createdStockItems.length,
    reminderCount,
    customers: createdCustomers,
    stockItems: createdStockItems,
  };
}

