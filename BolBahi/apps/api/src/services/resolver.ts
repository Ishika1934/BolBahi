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

  const cleanedLower = cleaned.toLowerCase();

  // 2. Exact name match (case-insensitive)
  const exactMatches = customers.filter(
    (c) => c.name.toLowerCase() === cleanedLower || stripHonorifics(c.name).toLowerCase() === cleanedLower
  );
  if (exactMatches.length === 1) {
    return { matchType: 'exact', customer: exactMatches[0], cleanedName: cleaned };
  }
  if (exactMatches.length > 1) {
    return { matchType: 'ambiguous', candidates: exactMatches, cleanedName: cleaned };
  }

  // 3. Exact alias match
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

  return {
    matchType: 'fuzzy',
    customer: topMatch.item.customer,
    cleanedName: cleaned,
  };
}

