import { connectDB, disconnectDB } from '../src/lib/db.js';
import { Shop } from '../src/models/Shop.js';
import { User } from '../src/models/User.js';
import { registerUser, loginUser, getCurrentAuth } from '../src/services/auth.js';

async function runTest() {
  console.log('🧪 Starting Step 1 Multi-tenancy & Auth Isolation Test...');
  await connectDB();

  // Clean test accounts if present
  await User.deleteMany({ identifier: { $in: ['test_shop_a@test.com', 'test_shop_b@test.com'] } });

  // 1. Register Shop A
  const resA = await registerUser({
    shopName: 'Test Shop A',
    ownerName: 'Owner A',
    identifier: 'test_shop_a@test.com',
    password: 'password123',
    language: 'hi-IN',
  });
  console.log('✓ Registered Shop A:', resA.shop.name, 'ShopId:', resA.shop.id);

  // 2. Register Shop B
  const resB = await registerUser({
    shopName: 'Test Shop B',
    ownerName: 'Owner B',
    identifier: 'test_shop_b@test.com',
    password: 'password123',
    language: 'en-IN',
  });
  console.log('✓ Registered Shop B:', resB.shop.name, 'ShopId:', resB.shop.id);

  // 3. Verify IDs are strictly different
  if (resA.shop.id === resB.shop.id) {
    throw new Error('Isolation failed: Shop A and B have identical shopId!');
  }
  console.log('✓ Verified Shop A & B have distinct shop IDs');

  // 4. Verify login returns correct shopId
  const loginA = await loginUser('test_shop_a@test.com', 'password123');
  const loginB = await loginUser('test_shop_b@test.com', 'password123');

  if (loginA.shop.id !== resA.shop.id || loginB.shop.id !== resB.shop.id) {
    throw new Error('Isolation failed: Logins mapped to incorrect shops!');
  }
  console.log('✓ Login verified for both shops with strict tenant binding');

  // 5. Verify getCurrentAuth
  const meA = await getCurrentAuth(resA.user.id, resA.shop.id);
  const meB = await getCurrentAuth(resB.user.id, resB.shop.id);
  if (meA.shop.name !== 'Test Shop A' || meB.shop.name !== 'Test Shop B') {
    throw new Error('Isolation failed: getCurrentAuth returned mismatched shop info');
  }
  console.log('✓ getCurrentAuth verified: No cross-talk between Shop A and Shop B');

  console.log('🎉 ALL STEP 1 TESTS PASSED!');
  await disconnectDB();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

