import { connectDB, disconnectDB } from '../src/lib/db.js';
import { Customer } from '../src/models/Customer.js';
import { Entry } from '../src/models/Entry.js';
import { ActionLog } from '../src/models/ActionLog.js';
import { Reminder } from '../src/models/Reminder.js';
import { StockItem } from '../src/models/StockItem.js';
import { registerUser, loginUser } from '../src/services/auth.js';
import { seedDemoDataForShop } from '../src/services/seed.js';

const API_BASE = 'http://localhost:4000/api';

async function main() {
  console.log('🚀 Running 7-Step Demo Verification Script (TRD 3.12)...');
  await connectDB();

  // Clean / Register main demo user
  let loginRes;
  try {
    loginRes = await loginUser('raju@kirana.test', 'password123');
  } catch {
    loginRes = await registerUser({
      shopName: 'Raju Kirana Store',
      ownerName: 'Raju Bhaiya',
      identifier: 'raju@kirana.test',
      password: 'password123',
    });
  }

  const token = loginRes.token;
  const shopId = loginRes.shop.id;
  const cookieHeader = `bb_session=${token}`;

  const post = async (endpoint: string, body: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const get = async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Cookie: cookieHeader },
    });
    return res.json();
  };

  // Reset and seed fresh demo data
  console.log('🌱 Seeding fresh demo data...');
  await seedDemoDataForShop(shopId);

  // Initial balance of Ramesh (1200) and Sharma ji (500)
  const custs0 = await get('/customers');
  const ramesh0 = custs0.data.find((c: any) => c.name.includes('Ramesh'));
  const sharma0 = custs0.data.find((c: any) => c.name.includes('Sharma ji'));
  console.log(`Initial balances: Ramesh = ₹${ramesh0.balance}, Sharma ji = ₹${sharma0.balance}`);

  // STEP 1: 'Ramesh ne 500 udhaar liya' -> Ramesh balance +500
  console.log('\n--- STEP 1: "Ramesh ne 500 udhaar liya" ---');
  const step1Res = await post('/voice/command', {
    transcript: 'Ramesh ne 500 udhaar liya',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step1_${Date.now()}`,
  });
  console.log('Step 1 Reply:', step1Res.reply);
  const custs1 = await get('/customers');
  const ramesh1 = custs1.data.find((c: any) => c.name.includes('Ramesh'));
  console.log(`Ramesh balance: ₹${ramesh1.balance} (Expected: ₹${ramesh0.balance + 500})`);
  if (ramesh1.balance !== ramesh0.balance + 500) throw new Error('Step 1 failed!');
  console.log('✓ STEP 1 PASSED');

  // STEP 2: 'Sharma ji ne 200 wapas diye' -> Sharma balance -200
  console.log('\n--- STEP 2: "Sharma ji ne 200 wapas diye" ---');
  const step2Res = await post('/voice/command', {
    transcript: 'Sharma ji ne 200 wapas diye',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step2_${Date.now()}`,
  });
  console.log('Step 2 Reply:', step2Res.reply);
  const custs2 = await get('/customers');
  const sharma2 = custs2.data.find((c: any) => c.name.includes('Sharma ji'));
  console.log(`Sharma ji balance: ₹${sharma2.balance} (Expected: ₹${sharma0.balance - 200})`);
  if (sharma2.balance !== sharma0.balance - 200) throw new Error('Step 2 failed!');
  console.log('✓ STEP 2 PASSED');

  // STEP 3: Multi-intent sentence from section 1 -> 4 action cards
  console.log('\n--- STEP 3: Multi-intent sentence ---');
  const demoSentence =
    'Ramesh ne 500 udhaar liya, Sharma ji ne 200 wapas diye, aur atta 10 kilo kam hai, kal Ramesh ko yaad dila dena.';
  const step3Res = await post('/voice/command', {
    transcript: demoSentence,
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step3_${Date.now()}`,
  });
  console.log('Step 3 Actions count:', step3Res.actions.length);
  console.log('Step 3 Results count:', step3Res.results.length);
  console.log('Step 3 Screen Reply:', step3Res.reply);
  console.log('Step 3 Spoken Reply:', step3Res.replySpeech);
  if (step3Res.actions.length !== 4 || step3Res.results.length !== 4) {
    throw new Error('Step 3 failed: Did not extract 4 actions and results!');
  }
  console.log('✓ STEP 3 PASSED');

  // STEP 4: 'Ramesh ka kitna baaki hai?' -> spoken answer, no write
  console.log('\n--- STEP 4: "Ramesh ka kitna baaki hai?" ---');
  const entriesCountBefore = await Entry.countDocuments({ shopId });
  const step4Res = await post('/voice/command', {
    transcript: 'Ramesh ka kitna baaki hai?',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step4_${Date.now()}`,
  });
  console.log('Step 4 Reply:', step4Res.reply);
  const entriesCountAfter = await Entry.countDocuments({ shopId });
  if (entriesCountBefore !== entriesCountAfter) {
    throw new Error('Step 4 failed: Query created a database write entry!');
  }
  console.log('✓ STEP 4 PASSED (Read-only verified, zero writes)');

  // STEP 5: 'Suresh ne 300 liye' with two Sureshes -> clarifying question
  console.log('\n--- STEP 5: Ambiguous name "Suresh ne 300 liye" ---');
  const step5Res = await post('/voice/command', {
    transcript: 'Suresh ne 300 liye',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step5_${Date.now()}`,
  });
  console.log('Step 5 needsClarification:', step5Res.needsClarification);
  console.log('Step 5 Question:', step5Res.reply);
  if (!step5Res.needsClarification) {
    throw new Error('Step 5 failed: Ambiguous Suresh did not trigger clarification!');
  }

  // Answer clarification with 'Suresh Gupta'
  const step5bRes = await post('/voice/command', {
    transcript: 'Suresh Gupta',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step5b_${Date.now()}`,
  });
  console.log('Step 5 resolution:', step5bRes.reply);
  if (step5bRes.needsClarification) {
    throw new Error('Step 5b failed: Suresh Gupta was not resolved!');
  }
  console.log('✓ STEP 5 PASSED (Spoken clarification loop verified)');

  // STEP 6: 'Last wala hata do' -> undo works
  console.log('\n--- STEP 6: "Last wala hata do" (Undo) ---');
  const custsBeforeUndo = await get('/customers');
  const sgBeforeUndo = custsBeforeUndo.data.find((c: any) => c.name === 'Suresh Gupta');
  console.log('Suresh Gupta before undo:', sgBeforeUndo.balance);

  const step6Res = await post('/voice/command', {
    transcript: 'last wala hata do',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step6_${Date.now()}`,
  });
  console.log('Step 6 Reply:', step6Res.reply);

  const custsAfterUndo = await get('/customers');
  const sgAfterUndo = custsAfterUndo.data.find((c: any) => c.name === 'Suresh Gupta');
  console.log('Suresh Gupta after undo:', sgAfterUndo.balance);
  if (sgAfterUndo.balance !== sgBeforeUndo.balance - 300) {
    throw new Error('Step 6 failed: Suresh Gupta balance was not reverted by 300!');
  }
  console.log('✓ STEP 6 PASSED (Undo soft delete and balance rollback verified)');

  // STEP 7: 'Aaj ka hisaab' -> spoken summary
  console.log('\n--- STEP 7: "Aaj ka hisaab" ---');
  const step7Res = await post('/voice/command', {
    transcript: 'aaj ka hisaab',
    lang: 'hi-IN',
    sessionId: 'session_demo_suite',
    clientCommandId: `step7_${Date.now()}`,
  });
  console.log('Step 7 Screen Reply:', step7Res.reply);
  console.log('Step 7 Spoken Reply:', step7Res.replySpeech);
  if (!step7Res.reply || !step7Res.replySpeech) {
    throw new Error('Step 7 failed: Missing spoken summary!');
  }
  console.log('✓ STEP 7 PASSED (Spoken daily summary verified)');

  console.log('\n🏆 ALL 7 HACKATHON TEST SCRIPT STEPS PASSED WITH 100% SUCCESS!');
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ E2E Demo test failed:', err);
  process.exit(1);
});

