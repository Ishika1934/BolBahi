export interface ReplyOutput {
  screen: string;
  speech: string;
}

export function formatCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString('en-IN')}`;
}

export function buildUdhaarReply(
  customerName: string,
  amount: number,
  balance: number,
  isNewCustomer: boolean = false,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  const formattedAmount = amount.toLocaleString('en-IN');
  const formattedBalance = balance.toLocaleString('en-IN');

  if (lang === 'en-IN') {
    const prefix = isNewCustomer ? `Added new customer ${customerName}. ` : '';
    const text = `${prefix}Recorded ₹ ${formattedAmount} credit for ${customerName}. Total balance is ₹ ${formattedBalance}.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi (no mixed English words)
  const screenPrefix = isNewCustomer ? 'नया ग्राहक जोड़ दिया। ' : '';
  const screen = `हो गया। ${screenPrefix}${customerName} के खाते में ₹ ${formattedAmount} उधार दर्ज किए। कुल बाकी ₹ ${formattedBalance} है।`;
  const speech = `हो गया। ${screenPrefix}${customerName} के खाते में ${formattedAmount} रुपये उधार दर्ज किए। कुल बाकी ${formattedBalance} रुपये है।`;

  return { screen, speech };
}

export function buildPaymentReply(
  customerName: string,
  amount: number,
  balance: number,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  const formattedAmount = amount.toLocaleString('en-IN');
  const formattedBalance = balance.toLocaleString('en-IN');

  if (lang === 'en-IN') {
    const text = `Received ₹ ${formattedAmount} payment from ${customerName}. Remaining balance is ₹ ${formattedBalance}.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi
  const screen = `हो गया। ${customerName} से ₹ ${formattedAmount} जमा प्राप्त हुए। अब बाकी ₹ ${formattedBalance} है।`;
  const speech = `हो गया। ${customerName} से ${formattedAmount} रुपये जमा प्राप्त हुए। अब बाकी ${formattedBalance} रुपये है।`;

  return { screen, speech };
}

export function buildReminderReply(
  customerName: string,
  when: string,
  channel: string = 'email',
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  if (lang === 'en-IN') {
    const text = `Payment reminder scheduled for ${customerName} on ${when}.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi
  const screen = `${customerName} को ${when} के लिए भुगतान रिमाइंडर सेट कर दिया है।`;
  const speech = `${customerName} को ${when} के लिए भुगतान रिमाइंडर सेट कर दिया है।`;

  return { screen, speech };
}

export function buildStockReply(
  item: string,
  quantityHint?: string,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  const itemCap = item.charAt(0).toUpperCase() + item.slice(1);
  const qty = quantityHint ? ` (${quantityHint})` : '';

  if (lang === 'en-IN') {
    const text = `Added ${itemCap}${qty} to low stock list.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi
  const screen = `${itemCap}${qty} कम स्टॉक सूची में जोड़ दिया गया है।`;
  const speech = `${itemCap}${qty} कम स्टॉक सूची में जोड़ दिया गया है।`;

  return { screen, speech };
}

export function buildQueryBalanceReply(
  customerName: string,
  balance: number,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  const formatted = balance.toLocaleString('en-IN');
  if (lang === 'en-IN') {
    const text = `${customerName}'s current outstanding balance is ₹ ${formatted}.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi
  const screen = `${customerName} का कुल बाकी ₹ ${formatted} है।`;
  const speech = `${customerName} का कुल बाकी ${formatted} रुपये है।`;

  return { screen, speech };
}

export function buildDailySummaryReply(
  udhaarTotal: number,
  paymentTotal: number,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  const formattedU = udhaarTotal.toLocaleString('en-IN');
  const formattedP = paymentTotal.toLocaleString('en-IN');

  if (lang === 'en-IN') {
    const text = `Today's ledger: ₹ ${formattedU} credit given, ₹ ${formattedP} payments collected.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi
  const screen = `आज ₹ ${formattedU} का उधार दिया गया और ₹ ${formattedP} जमा हुआ।`;
  const speech = `आज ${formattedU} रुपये का उधार दिया गया, और ${formattedP} रुपये जमा हुआ।`;

  return { screen, speech };
}

export function buildUndoReply(
  entriesRemoved: number,
  remindersCancelled: number,
  remindersAlreadySent: number,
  lang: 'hi-IN' | 'en-IN' = 'hi-IN'
): ReplyOutput {
  if (lang === 'en-IN') {
    const text = `Undone last command. Reverted ${entriesRemoved} ledger entry.`;
    return { screen: text, speech: text };
  }

  // Pure natural Hindi
  let note = '';
  if (remindersAlreadySent > 0) {
    note = ` एक रिमाइंडर पहले ही भेजा जा चुका है।`;
  }
  const screen = `पिछली कमांड हटा दी गई। ${entriesRemoved} प्रविष्टि निरस्त कर दी गई।${note}`;
  const speech = `पिछली कमांड हटा दी गई। ${entriesRemoved} प्रविष्टि निरस्त कर दी गई।`;

  return { screen, speech };
}
