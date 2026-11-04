import { Action, ParseResult } from '../../schemas/actions.js';
import { LLMInput } from './provider.js';

export function parseHindiNumberWords(text: string): number | null {
  const clean = text.toLowerCase();
  if (clean.includes('dedh hazaar') || clean.includes('1500')) return 1500;
  if (clean.includes('dhai hazaar') || clean.includes('2500')) return 2500;
  if (clean.includes('do hazaar paanch sau')) return 2500;
  if (clean.includes('ek hazaar') || clean.includes('1 hazaar')) return 1000;
  if (clean.includes('do hazaar') || clean.includes('2 hazaar')) return 2000;
  if (clean.includes('teen hazaar') || clean.includes('3 hazaar')) return 3000;
  if (clean.includes('paanch sau') || clean.includes('5 sau')) return 500;
  if (clean.includes('do sau') || clean.includes('2 sau')) return 200;
  if (clean.includes('teen sau') || clean.includes('3 sau')) return 300;
  if (clean.includes('chaar sau') || clean.includes('4 sau')) return 400;
  if (clean.includes('ek sau') || clean.includes('1 sau')) return 100;

  // Direct digits
  const numMatch = text.match(/\b(\d+)\b/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

export function fallbackParse(input: LLMInput): ParseResult {
  const t = input.transcript.trim();
  const lower = t.toLowerCase();
  const actions: Action[] = [];

  // Check if answering a pending clarification question
  if (input.pendingQuestion) {
    for (const c of input.customers) {
      if (lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower)) {
        // Matched customer answer
        return {
          language: 'hinglish',
          actions: [{ type: 'add_udhaar', customer: c, amount: parseHindiNumberWords(input.pendingQuestion) || 300 }],
          confidence: 0.9,
          source: 'fallback',
        };
      }
    }
  }

  // Check update_customer (correcting misheard name)
  const renameMatch = t.match(/(?:change|update)\s+name\s+(?:of\s+)?([a-zA-Z\u0900-\u097F]+)\s+(?:to|kar do)\s+([a-zA-Z\u0900-\u097F\s]+)/i)
    || t.match(/(?:naam\s+badal\s+kar|naam\s+badlo)\s+([a-zA-Z\u0900-\u097F]+)\s+(?:to|kar do)?\s*([a-zA-Z\u0900-\u097F\s]+)/i);
  if (renameMatch) {
    return {
      language: 'hinglish',
      actions: [{
        type: 'update_customer',
        customer: renameMatch[1].trim(),
        newName: renameMatch[2].trim(),
      }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // 1. Undo
  if (lower.includes('hata do') || lower.includes('undo') || lower.includes('galat ho gaya') || lower.includes('last wala')) {
    return {
      language: 'hinglish',
      actions: [{ type: 'undo_last' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // 2. Daily summary
  if (lower.includes('aaj ka hisaab') || lower.includes('aaj kitna udhaar') || lower.includes('daily summary') || lower.includes('aaj ka total')) {
    return {
      language: 'hinglish',
      actions: [{ type: 'daily_summary' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // 3. Show View / Tab Navigation commands
  if (
    lower.includes('show stock') ||
    lower.includes('stock alert') ||
    lower.includes('stock dikhao') ||
    lower.includes('low stock') ||
    lower.includes('kam stock') ||
    lower.includes('stock kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'stock' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show reminder') ||
    lower.includes('reminder dikhao') ||
    lower.includes('tagada dikhao') ||
    lower.includes('reminders kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'reminders' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show customer') ||
    lower.includes('customer ledger') ||
    lower.includes('customer dikhao') ||
    lower.includes('customers dikhao') ||
    lower.includes('grahak khata') ||
    lower.includes('grahak dikhao') ||
    lower.includes('customers kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'customers' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show record') ||
    lower.includes('records dikhao') ||
    lower.includes('entries dikhao') ||
    lower.includes('len den dikhao') ||
    lower.includes('pravistiyan') ||
    lower.includes('records kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'records' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show history') ||
    lower.includes('history dikhao') ||
    lower.includes('commands dikhao') ||
    lower.includes('aawaz itihas')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'commands' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('hisaab dikhao') ||
    lower.includes('show hisaab') ||
    lower.includes('daily hisaab dikhao') ||
    lower.includes('hisaab kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'hisaab' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  if (
    lower.includes('show setting') ||
    lower.includes('settings dikhao') ||
    lower.includes('dukan settings') ||
    lower.includes('settings kholo')
  ) {
    return {
      language: 'hinglish',
      actions: [{ type: 'show_view', view: 'settings' }],
      confidence: 0.95,
      source: 'fallback',
    };
  }

  // Helper to extract known customer from list
  const findCustomer = (subtext: string): string | null => {
    for (const c of input.customers) {
      const firstName = c.split(' ')[0].toLowerCase();
      if (subtext.toLowerCase().includes(firstName)) {
        return c.split(' ')[0]; // return matched first name
      }
    }
    // Fallback: check word before "ne" or "ko"
    const m = subtext.match(/([a-zA-Z\u0900-\u097F]+)\s+(?:ne|ko|ka|ki)\b/i);
    if (m && !['aaj', 'kal', 'parson', 'last', 'atta', 'chini'].includes(m[1].toLowerCase())) {
      return m[1];
    }
    return null;
  };

  // 3. Multi-intent demo sentence special split (comma, 'aur', 'and')
  const clauses = t.split(/[,;\n]|(?:\baur\b)/i).map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    const clLower = clause.toLowerCase();

    // Check query_balance
    if (clLower.includes('kitna baaki') || clLower.includes('ka hisaab') || clLower.includes('how much balance')) {
      const cust = findCustomer(clause);
      if (cust) {
        actions.push({ type: 'query_balance', customer: cust });
        continue;
      }
    }

    // Check add_low_stock
    if (clLower.includes('kam hai') || clLower.includes('khatam ho') || clLower.includes('low stock') || clLower.includes('stock kam')) {
      let item = 'atta';
      if (clLower.includes('chini')) item = 'chini';
      else if (clLower.includes('atta')) item = 'atta';
      else if (clLower.includes('tel')) item = 'tel';
      else if (clLower.includes('chawal')) item = 'chawal';

      const qtyMatch = clause.match(/(\d+\s*(?:kilo|kg|packet|litre|liter|gm|g)?)/i);
      actions.push({
        type: 'add_low_stock',
        item,
        quantityHint: qtyMatch ? qtyMatch[1] : undefined,
      });
      continue;
    }

    // Check set_reminder
    if (
      clLower.includes('yaad dila') ||
      clLower.includes('reminder') ||
      clLower.includes('bhej do') ||
      clLower.includes('tagada') ||
      clLower.includes('phone number')
    ) {
      const cust = findCustomer(clause);
      let when = 'now';
      if (clLower.includes('kal')) when = 'kal';
      else if (clLower.includes('parson')) when = 'parson';
      else if (clLower.includes('friday')) when = 'Friday';

      actions.push({
        type: 'set_reminder',
        customer: cust || undefined,
        when,
        message: cust ? `${cust} ko payment ka reminder` : 'Payment reminder',
      });
      continue;
    }

    // Check add_payment
    if (
      clLower.includes('wapas') ||
      clLower.includes('jama') ||
      clLower.includes('paid') ||
      clLower.includes('de diye') ||
      clLower.includes('diye')
    ) {
      const cust = findCustomer(clause);
      const amount = parseHindiNumberWords(clause);
      if (cust && amount) {
        actions.push({
          type: 'add_payment',
          customer: cust,
          amount,
        });
        continue;
      }
    }

    // Check add_udhaar
    if (
      clLower.includes('udhaar') ||
      clLower.includes('likh') ||
      clLower.includes('baaki') ||
      clLower.includes('liya') ||
      clLower.includes('maal diya') ||
      clLower.includes('credit')
    ) {
      const cust = findCustomer(clause);
      const amount = parseHindiNumberWords(clause);
      if (cust && amount) {
        actions.push({
          type: 'add_udhaar',
          customer: cust,
          amount,
        });
        continue;
      }
    }
  }

  // If no clauses matched but sentence has customer + amount + udhaar word
  if (actions.length === 0) {
    const cust = findCustomer(t);
    const amount = parseHindiNumberWords(t);
    if (cust && amount) {
      if (lower.includes('jama') || lower.includes('wapas') || lower.includes('paid')) {
        actions.push({ type: 'add_payment', customer: cust, amount });
      } else {
        actions.push({ type: 'add_udhaar', customer: cust, amount });
      }
    }
  }

  return {
    language: 'hinglish',
    actions,
    confidence: actions.length > 0 ? 0.8 : 0.2,
    source: 'fallback',
  };
}
