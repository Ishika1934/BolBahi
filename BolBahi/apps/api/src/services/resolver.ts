import Fuse from 'fuse.js';
import { Customer, ICustomer } from '../models/Customer.js';
import { Types } from 'mongoose';

export interface ResolveResult {
  matchType: 'exact' | 'alias' | 'fuzzy' | 'ambiguous' | 'not_found';
  customer?: ICustomer;
  candidates?: ICustomer[];
  cleanedName: string;
}

const HONORIFICS_REGEX = /\b(ji|bhaiya|bhai|sahab|saheb|uncle|aunty|ben|didi|babu)\b/gi;

export function stripHonorifics(name: string): string {
  return name.replace(HONORIFICS_REGEX, '').trim().replace(/\s+/g, ' ');
}

export async function resolveCustomer(
  shopId: string,
  rawName: string
): Promise<ResolveResult> {
  const sId = new Types.ObjectId(shopId);
  const cleaned = stripHonorifics(rawName);

  if (!cleaned) {
    return { matchType: 'not_found', cleanedName: rawName };
  }

  // 1. Fetch all active customers for this shop
  const customers = await Customer.find({ shopId: sId, archivedAt: null });

  if (customers.length === 0) {
    return { matchType: 'not_found', cleanedName: cleaned };
  }

  // 1b. Phone number match (if input contains digits matching a customer's phone)
  const digits = rawName.replace(/\D/g, '');
  if (digits.length >= 7) {
    const phoneMatches = customers.filter(
      (c) => c.phone && (c.phone.replace(/\D/g, '') === digits || c.phone.replace(/\D/g, '').endsWith(digits))
    );
    if (phoneMatches.length === 1) {
      return { matchType: 'exact', customer: phoneMatches[0], cleanedName: phoneMatches[0].name };
    }
    if (phoneMatches.length > 1) {
      return { matchType: 'ambiguous', candidates: phoneMatches, cleanedName: cleaned };
    }
  }

  const cleanedLower = cleaned.toLowerCase();

  // 2. Single word name / first-name / alias resolution with ambiguity check
  const isSingleWord = !cleaned.includes(' ');
  if (isSingleWord) {
    const candidateMatches = customers.filter((c) => {
      const cLower = c.name.toLowerCase();
      const cStripLower = stripHonorifics(c.name).toLowerCase();
      const cFirst = cStripLower.split(' ')[0];
      const hasAlias = c.aliases.some(
        (a) => a.toLowerCase() === cleanedLower || stripHonorifics(a).toLowerCase() === cleanedLower
      );
      return cLower === cleanedLower || cStripLower === cleanedLower || cFirst === cleanedLower || hasAlias;
    });

    if (candidateMatches.length > 1) {
      return { matchType: 'ambiguous', candidates: candidateMatches, cleanedName: cleaned };
    }
    if (candidateMatches.length === 1) {
      return { matchType: 'exact', customer: candidateMatches[0], cleanedName: cleaned };
    }
  }

  // 3. Exact full name match (case-insensitive)
  const exactMatches = customers.filter(
    (c) => c.name.toLowerCase() === cleanedLower || stripHonorifics(c.name).toLowerCase() === cleanedLower
  );
  if (exactMatches.length === 1) {
    return { matchType: 'exact', customer: exactMatches[0], cleanedName: cleaned };
  }
  if (exactMatches.length > 1) {
    return { matchType: 'ambiguous', candidates: exactMatches, cleanedName: cleaned };
  }

  // 4. Exact alias match
  const aliasMatches = customers.filter((c) =>
    c.aliases.some((a) => a.toLowerCase() === cleanedLower || stripHonorifics(a).toLowerCase() === cleanedLower)
  );
  if (aliasMatches.length === 1) {
    return { matchType: 'alias', customer: aliasMatches[0], cleanedName: cleaned };
  }
  if (aliasMatches.length > 1) {
    return { matchType: 'ambiguous', candidates: aliasMatches, cleanedName: cleaned };
  }

  // 4. First name exact match (e.g. "Suresh" when there might be multiple or single)
  const firstNameMatches = customers.filter((c) => {
    const cFirstName = stripHonorifics(c.name).split(' ')[0].toLowerCase();
    return cFirstName === cleanedLower;
  });
  if (firstNameMatches.length === 1) {
    return { matchType: 'exact', customer: firstNameMatches[0], cleanedName: cleaned };
  }
  if (firstNameMatches.length > 1) {
    return { matchType: 'ambiguous', candidates: firstNameMatches, cleanedName: cleaned };
  }

  // 5. Fuzzy match with Fuse.js (threshold 0.35)
  const fuseList = customers.map((c) => ({
    customer: c,
    searchStr: `${c.name} ${stripHonorifics(c.name)} ${c.aliases.join(' ')}`,
  }));

  const fuse = new Fuse(fuseList, {
    keys: ['searchStr'],
    threshold: 0.35,
    includeScore: true,
  });

  const fuzzyResults = fuse.search(cleaned);

  if (fuzzyResults.length === 0) {
    return { matchType: 'not_found', cleanedName: cleaned };
  }

  // Check top match score vs second match score
  const topMatch = fuzzyResults[0];
  const secondMatch = fuzzyResults[1];

  if (
    secondMatch &&
    topMatch.score !== undefined &&
    secondMatch.score !== undefined &&
    Math.abs(topMatch.score - secondMatch.score) < 0.08
  ) {
    // Two very close matches -> Ambiguous!
    return {
      matchType: 'ambiguous',
      candidates: [topMatch.item.customer, secondMatch.item.customer],
      cleanedName: cleaned,
    };
  }

  // Prevent surname-only false positives when first names are completely different
  const inputWords = cleanedLower.split(/\s+/);
  if (inputWords.length > 1) {
    const candidateFirst = stripHonorifics(topMatch.item.customer.name).split(/\s+/)[0].toLowerCase();
    const inputFirst = inputWords[0];
    const candidateAliases = topMatch.item.customer.aliases.map((a) => a.toLowerCase());
    const firstMatches =
      candidateFirst === inputFirst ||
      candidateAliases.some((a) => a.includes(inputFirst) || inputFirst.includes(a));

    if (!firstMatches) {
      return { matchType: 'not_found', cleanedName: cleaned };
    }
  }

  return {
    matchType: 'fuzzy',
    customer: topMatch.item.customer,
    cleanedName: cleaned,
  };
}

