import { Types } from 'mongoose';
import { Entry } from '../models/Entry.js';
import { Customer } from '../models/Customer.js';
import { StockItem } from '../models/StockItem.js';
import { Reminder } from '../models/Reminder.js';
import { resolveCustomer } from './resolver.js';
import { buildQueryBalanceReply, buildDailySummaryReply } from './replies.js';
import { ActionResult } from './executor.js';
import { emitShopEvent } from '../lib/sse.js';

export async function executeQueryBalance(
  shopId: string,
  customerName: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const isEn = lang === 'en-IN';
  const resolved = await resolveCustomer(shopId, customerName);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question =
      lang === 'hi-IN'
        ? `दुकान में '${resolved.cleanedName}' नाम के कई ग्राहक हैं: ${candidateNames.join(' और ')}। कृपया पूरा नाम बताएं।`
        : `There are multiple customers named "${resolved.cleanedName}": ${candidateNames.join(' and ')}. Please specify full name.`;
    return {
      ok: false,
      type: 'query_balance',
      summary: `Ambiguous: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
    };
  }

  let customer = resolved.customer;
  let isNewCustomer = false;

  // Auto-create customer if speaking balance for a customer who doesn't exist yet
  if (!customer) {
    const sId = new Types.ObjectId(shopId);
    const nameToUse = resolved.cleanedName || customerName.trim();
    customer = await Customer.create({
      shopId: sId,
      name: nameToUse,
      aliases: [nameToUse],
      balance: 0,
    });
    isNewCustomer = true;
    emitShopEvent(shopId, 'ledger.updated', { customerId: customer._id.toString() });
  }

  if (isNewCustomer) {
    const replyScreen = isEn
      ? `Created customer "${customer.name}". Current balance: ₹0.`
      : `"${customer.name}" नया ग्राहक खाता दर्ज किया गया। वर्तमान हिसाब: ₹0।`;
    const replySpeech = isEn
      ? `Created new customer account for ${customer.name}. Their balance is 0 rupees.`
      : `हो गया। ${customer.name} नया ग्राहक खाता बना दिया गया है। अभी उनका हिसाब 0 रुपये है।`;

    return {
      ok: true,
      type: 'query_balance',
      summary: `${customer.name}: New customer (₹0)`,
      spokenPart: replySpeech,
      data: {
        customerId: customer._id.toString(),
        customerName: customer.name,
        balance: 0,
        isNewCustomer: true,
        replyScreen,
        replySpeech,
      },
    };
  }

  const reply = buildQueryBalanceReply(customer.name, customer.balance, lang);

  return {
    ok: true,
    type: 'query_balance',
    summary: `${customer.name}: Kul baaki ₹${customer.balance.toLocaleString('en-IN')}`,
    spokenPart: reply.speech,
    data: {
      customerId: customer._id.toString(),
      customerName: customer.name,
      balance: customer.balance,
      isNewCustomer: false,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

export async function executeQueryCustomerInfo(
  shopId: string,
  customerName: string,
  field: 'phone' | 'email' | 'all' = 'all',
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const isEn = lang === 'en-IN';
  const resolved = await resolveCustomer(shopId, customerName);

  if (resolved.matchType === 'ambiguous') {
    const candidateNames = resolved.candidates?.map((c) => c.name) || [];
    const question =
      lang === 'hi-IN'
        ? `दुकान में '${resolved.cleanedName}' नाम के कई ग्राहक हैं: ${candidateNames.join(' और ')}। कृपया पूरा नाम या फोन नंबर बताएं।`
        : `There are multiple customers named "${resolved.cleanedName}": ${candidateNames.join(' and ')}. Please specify full name or phone number.`;
    return {
      ok: false,
      type: 'query_customer_info',
      summary: `Ambiguous: ${resolved.cleanedName}`,
      needsClarification: true,
      clarificationQuestion: question,
      clarificationOptions: candidateNames,
    };
  }

  const customer = resolved.customer;
  if (!customer) {
    const notFoundSpeech = isEn
      ? `No customer named ${customerName} found.`
      : `${customerName} नाम का कोई ग्राहक नहीं मिला।`;
    return {
      ok: false,
      type: 'query_customer_info',
      summary: `Customer not found: ${customerName}`,
      needsClarification: false,
      error: 'NOT_FOUND',
      spokenPart: notFoundSpeech,
      data: {
        replyScreen: isEn
          ? `No customer named "${customerName}" found.`
          : `"${customerName}" नाम का कोई ग्राहक नहीं मिला।`,
        replySpeech: notFoundSpeech,
      },
    };
  }

  const phone = customer.phone?.trim();
  const email = customer.email?.trim();

  // Format phone digits spaced out for clear TTS reading (e.g. "9 8 7 6 5 4 3 2 1 0")
  const spacedPhone = phone ? phone.split('').join(' ') : '';

  let replyScreen = '';
  let replySpeech = '';

  if (field === 'phone') {
    if (phone) {
      replyScreen = isEn
        ? `${customer.name}'s phone number: ${phone}`
        : `${customer.name} का फोन नंबर: ${phone}`;
      replySpeech = isEn
        ? `${customer.name}'s phone number is ${spacedPhone}.`
        : `${customer.name} का फोन नंबर ${spacedPhone} है।`;
    } else {
      replyScreen = isEn
        ? `${customer.name} has no phone number recorded.`
        : `${customer.name} का कोई फोन नंबर दर्ज नहीं है।`;
      replySpeech = isEn
        ? `${customer.name} does not have a phone number recorded.`
        : `${customer.name} का कोई फोन नंबर दर्ज नहीं है।`;
    }
  } else if (field === 'email') {
    if (email) {
      replyScreen = isEn
        ? `${customer.name}'s email: ${email}`
        : `${customer.name} का ईमेल: ${email}`;
      replySpeech = isEn
        ? `${customer.name}'s email is ${email}.`
        : `${customer.name} का ईमेल ${email} है।`;
    } else {
      replyScreen = isEn
        ? `${customer.name} has no email address recorded.`
        : `${customer.name} का कोई ईमेल दर्ज नहीं है।`;
      replySpeech = isEn
        ? `${customer.name} does not have an email address recorded.`
        : `${customer.name} का कोई ईमेल पता दर्ज नहीं है।`;
    }
  } else {
    // Both phone and email
    const screenParts: string[] = [];
    const speechParts: string[] = [];

    if (phone) {
      screenParts.push(isEn ? `Phone: ${phone}` : `फोन: ${phone}`);
      speechParts.push(isEn ? `phone is ${spacedPhone}` : `फोन नंबर ${spacedPhone} है`);
    }
    if (email) {
      screenParts.push(isEn ? `Email: ${email}` : `ईमेल: ${email}`);
      speechParts.push(isEn ? `email is ${email}` : `ईमेल ${email} है`);
    }

    if (screenParts.length === 0) {
      replyScreen = isEn
        ? `${customer.name} has neither phone nor email recorded.`
        : `${customer.name} का कोई फोन या ईमेल दर्ज नहीं है।`;
      replySpeech = isEn
        ? `${customer.name} has no contact details recorded.`
        : `${customer.name} की कोई संपर्क जानकारी दर्ज नहीं है।`;
    } else {
      replyScreen = `${customer.name}: ${screenParts.join(' | ')}`;
      replySpeech = isEn
        ? `For ${customer.name}, ${speechParts.join(' and ')}.`
        : `${customer.name} का ${speechParts.join(' और ')}।`;
    }
  }

  return {
    ok: true,
    type: 'query_customer_info',
    summary: `${customer.name}: ${phone || email || 'No contact info'}`,
    spokenPart: replySpeech,
    data: {
      customerId: customer._id.toString(),
      customerName: customer.name,
      phone,
      email,
      balance: customer.balance,
      replyScreen,
      replySpeech,
    },
  };
}

export async function executeDailySummary(
  shopId: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): Promise<ActionResult> {
  const sId = new Types.ObjectId(shopId);

  // Today start in local time
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayEntries = await Entry.find({
    shopId: sId,
    deletedAt: null,
    createdAt: { $gte: startOfDay },
  });

  let udhaarTotal = 0;
  let paymentTotal = 0;

  for (const e of todayEntries) {
    if (e.type === 'udhaar') udhaarTotal += e.amount;
    else if (e.type === 'payment') paymentTotal += e.amount;
  }

  const reply = buildDailySummaryReply(udhaarTotal, paymentTotal, lang);

  return {
    ok: true,
    type: 'daily_summary',
    summary: `Aaj ka hisaab: Udhaar ₹${udhaarTotal.toLocaleString('en-IN')}, Jama ₹${paymentTotal.toLocaleString('en-IN')}`,
    spokenPart: reply.speech,
    data: {
      udhaarTotal,
      paymentTotal,
      net: paymentTotal - udhaarTotal,
      replyScreen: reply.screen,
      replySpeech: reply.speech,
    },
  };
}

export async function getShopStats(shopId: string) {
  const sId = new Types.ObjectId(shopId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [customers, todayEntries, lowStockCount, pendingRemindersCount] = await Promise.all([
    Customer.find({ shopId: sId, archivedAt: null }).sort({ balance: -1 }),
    Entry.find({ shopId: sId, deletedAt: null, createdAt: { $gte: startOfDay } }),
    StockItem.countDocuments({ shopId: sId, status: 'low' }),
    Reminder.countDocuments({ shopId: sId, status: 'pending' }),
  ]);

  let totalOutstanding = 0;
  for (const c of customers) {
    if (c.balance > 0) totalOutstanding += c.balance;
  }

  let todayUdhaar = 0;
  let todayPayment = 0;
  for (const e of todayEntries) {
    if (e.type === 'udhaar') todayUdhaar += e.amount;
    else if (e.type === 'payment') todayPayment += e.amount;
  }

  const topDebtors = customers
    .filter((c) => c.balance > 0)
    .slice(0, 5)
    .map((c) => ({
      id: c._id.toString(),
      name: c.name,
      balance: c.balance,
      phone: c.phone,
    }));

  return {
    totalOutstanding,
    todayIn: todayPayment,
    todayOut: todayUdhaar,
    netToday: todayPayment - todayUdhaar,
    customerCount: customers.length,
    lowStockCount,
    pendingRemindersCount,
    topDebtors,
  };
}

