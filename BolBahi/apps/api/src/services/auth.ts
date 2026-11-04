import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { Shop, IShop } from '../models/Shop.js';
import { User, IUser } from '../models/User.js';
import { signToken } from '../lib/jwt.js';
import { AppError, authInvalidError } from '../lib/errors.js';
import { seedDemoDataForShop } from './seed.js';

// Precomputed cost-10 bcrypt hash for dummy compare when user is not found
const DUMMY_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoO0L/iF55F1vY/aY5yZt8jB16gU/VpQy2';

export interface RegisterInput {
  shopName: string;
  ownerName: string;
  identifier: string; // email or 10-digit Indian mobile
  password: string;
  language?: 'hi-IN' | 'en-IN';
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    identifier: string;
    shopId: string;
  };
  shop: {
    id: string;
    name: string;
    ownerName: string;
    language: 'hi-IN' | 'en-IN';
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const cleanIdentifier = input.identifier.trim().toLowerCase();

  // Check if identifier is already taken
  const existingUser = await User.findOne({ identifier: cleanIdentifier });
  if (existingUser) {
    throw new AppError(
      'VALIDATION',
      'Identifier is already registered',
      'Yeh email ya phone pehle se darj hai'
    );
  }

  // 1. Hash password with bcryptjs cost 10
  const passwordHash = await bcrypt.hash(input.password, 10);

  // 2. Create Shop
  const shop = await Shop.create({
    name: input.shopName.trim(),
    ownerName: input.ownerName.trim(),
    language: input.language || 'hi-IN',
  });

  // 3. Create User linked to the shop
  const user = await User.create({
    shopId: shop._id,
    identifier: cleanIdentifier,
    passwordHash,
  });

  // 4. Sign JWT (fresh shop starts with empty ledger; seed data only on explicit demand)
  const token = signToken({
    sub: user._id.toString(),
    shopId: shop._id.toString(),
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      identifier: user.identifier,
      shopId: shop._id.toString(),
    },
    shop: {
      id: shop._id.toString(),
      name: shop.name,
      ownerName: shop.ownerName,
      language: shop.language,
    },
  };
}

export async function loginUser(identifier: string, password: string): Promise<AuthResult> {
  const cleanIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({ identifier: cleanIdentifier });

  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const isMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !isMatch) {
    throw authInvalidError();
  }

  const shop = await Shop.findById(user.shopId);
  if (!shop) {
    throw authInvalidError();
  }

  const token = signToken({
    sub: user._id.toString(),
    shopId: shop._id.toString(),
  });

  return {
    token,
    user: {
      id: user._id.toString(),
      identifier: user.identifier,
      shopId: shop._id.toString(),
    },
    shop: {
      id: shop._id.toString(),
      name: shop.name,
      ownerName: shop.ownerName,
      language: shop.language,
    },
  };
}

export async function getCurrentAuth(userId: string, shopId: string): Promise<{
  user: { id: string; identifier: string; shopId: string };
  shop: { id: string; name: string; ownerName: string; language: 'hi-IN' | 'en-IN' };
}> {
  const [user, shop] = await Promise.all([
    User.findById(userId),
    Shop.findById(shopId),
  ]);

  if (!user || !shop) {
    throw authInvalidError();
  }

  return {
    user: {
      id: user._id.toString(),
      identifier: user.identifier,
      shopId: shop._id.toString(),
    },
    shop: {
      id: shop._id.toString(),
      name: shop.name,
      ownerName: shop.ownerName,
      language: shop.language,
    },
  };
}

