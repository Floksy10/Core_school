/**
 * Credit system integration tests.
 *
 * Runs against the live Express server using HTTP requests.
 * Start the server first: node server.js
 *
 * Usage: node tests/credits.test.js
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${label}`);
  } else {
    failed++;
    console.error(`  \u2717 FAIL: ${label}`);
  }
}

async function api(path, opts = {}) {
  const url = `${BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ────────────────────────────────────────────

async function run() {
  console.log('\n=== Credit System Tests ===\n');

  // 1. Create test user
  const email = `test_${Date.now()}@credits.test`;
  const password = 'TestPass123';
  const signup = await api('/api/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'Credits' }),
  });
  assert(signup.status === 201, 'Signup succeeds');
  const token = signup.body.token;
  const userId = signup.body.user.id;

  // 2. Initial balance should be 0
  console.log('\n-- Balance --');
  const bal0 = await api('/api/credits/balance', { headers: authHeader(token) });
  assert(bal0.status === 200, 'GET /api/credits/balance returns 200');
  assert(bal0.body.available === 0, 'Initial balance is 0');
  assert(bal0.body.held === 0, 'Initial held is 0');

  // 3. Cost calculation via preview
  console.log('\n-- Cost Preview --');
  const cost60 = await api('/api/credits/cost-preview', {
    method: 'POST',
    body: JSON.stringify({ subjectKey: 'mathematics', durationMinutes: 60 }),
  });
  assert(cost60.status === 200, 'Cost preview 60min returns 200');
  assert(cost60.body.cost === 45, 'Mathematics 60min = 45 credits');

  const cost30 = await api('/api/credits/cost-preview', {
    method: 'POST',
    body: JSON.stringify({ subjectKey: 'mathematics', durationMinutes: 30 }),
  });
  assert(cost30.status === 200, 'Cost preview 30min returns 200');
  assert(cost30.body.cost === 27, 'Mathematics 30min = ceil(45*0.6) = 27 credits');

  const cost90 = await api('/api/credits/cost-preview', {
    method: 'POST',
    body: JSON.stringify({ subjectKey: 'mathematics', durationMinutes: 90 }),
  });
  assert(cost90.status === 200, 'Cost preview 90min returns 200');
  assert(cost90.body.cost === 63, 'Mathematics 90min = ceil(45*1.4) = 63 credits');

  const costAI = await api('/api/credits/cost-preview', {
    method: 'POST',
    body: JSON.stringify({ subjectKey: 'ai', durationMinutes: 60 }),
  });
  assert(costAI.body.cost === 60, 'AI 60min = 60 credits');

  const costDS = await api('/api/credits/cost-preview', {
    method: 'POST',
    body: JSON.stringify({ subjectKey: 'data-science', durationMinutes: 90 }),
  });
  assert(costDS.body.cost === 91, 'Data Science 90min = ceil(65*1.4) = 91 credits');

  // 4. Insufficient credits on enroll
  console.log('\n-- Insufficient Credits --');
  const tutorsRes = await api('/api/tutors');
  const testTutorId = (tutorsRes.body.tutors && tutorsRes.body.tutors[0]) ? tutorsRes.body.tutors[0].id : null;

  if (testTutorId) {
    const enroll402 = await api('/api/enroll', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tutorId: testTutorId,
        classId: 'mathematics',
        durationMinutes: 60,
        subjectKey: 'mathematics',
      }),
    });
    assert(enroll402.status === 402, 'Enroll with 0 balance returns 402');
    assert(enroll402.body.required === 45, 'Reports required = 45');
    assert(enroll402.body.available === 0, 'Reports available = 0');
  } else {
    console.log('  (skipping enroll test: no tutors in database)');
  }

  // 5. Admin: give credits via adjustment
  console.log('\n-- Admin Credit Adjustment --');
  const adminLogin = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ilya.kudrenko@gmail.com', password: 'admin' }),
  });
  let adminToken = null;
  if (adminLogin.status === 200) {
    adminToken = adminLogin.body.token;
    const adjust = await api('/api/admin/credits/adjust', {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({ userId, amount: 200, reason: 'Test grant' }),
    });
    assert(adjust.status === 200, 'Admin adjustment succeeds');
    assert(adjust.body.newBalance === 200, 'Balance after +200 = 200');

    const bal1 = await api('/api/credits/balance', { headers: authHeader(token) });
    assert(bal1.body.available === 200, 'User sees 200 balance');
  } else {
    console.log('  (skipping admin tests: admin login failed — set correct admin password)');
  }

  // 6. Successful enrollment with credit hold
  if (testTutorId && adminToken) {
    console.log('\n-- Enrollment with Credits --');
    const enrollOk = await api('/api/enroll', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tutorId: testTutorId,
        classId: 'mathematics',
        durationMinutes: 60,
        subjectKey: 'mathematics',
      }),
    });
    assert(enrollOk.status === 201, 'Enroll with sufficient credits returns 201');
    assert(enrollOk.body.creditsCost === 45, 'Credits cost = 45');

    const bal2 = await api('/api/credits/balance', { headers: authHeader(token) });
    assert(bal2.body.available === 155, 'Balance after hold = 200 - 45 = 155');
    assert(bal2.body.held === 45, 'Held credits = 45');

    const enrollmentId = enrollOk.body.enrollment.id;

    // 7. Cancel >= 24h: full refund
    console.log('\n-- Cancel (>=24h, full refund) --');
    const cancelFull = await api(`/api/lessons/${enrollmentId}/cancel`, {
      method: 'POST',
      headers: authHeader(token),
    });
    assert(cancelFull.status === 200, 'Cancel returns 200');
    assert(cancelFull.body.refundedCredits === 45, 'Full refund of 45 credits');
    assert(cancelFull.body.chargedCredits === 0, 'No charge');

    const bal3 = await api('/api/credits/balance', { headers: authHeader(token) });
    assert(bal3.body.available === 200, 'Balance restored to 200 after full refund');

    // 8. Enroll again, then complete
    console.log('\n-- Complete Lesson --');
    const enroll2 = await api('/api/enroll', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tutorId: testTutorId,
        classId: 'biology',
        durationMinutes: 30,
        subjectKey: 'biology',
      }),
    });
    assert(enroll2.status === 201, 'Second enrollment succeeds');
    const enrId2 = enroll2.body.enrollment.id;
    const cost2 = enroll2.body.creditsCost;

    const complete = await api(`/api/lessons/${enrId2}/complete`, {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    assert(complete.status === 200, 'Complete returns 200');

    const bal4 = await api('/api/credits/balance', { headers: authHeader(token) });
    assert(bal4.body.available === 200 - cost2, `Balance after completion = ${200 - cost2}`);
    assert(bal4.body.held === 0, 'No held credits after completion');

    // 9. Enroll + no-show
    console.log('\n-- No-Show --');
    const enroll3 = await api('/api/enroll', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tutorId: testTutorId,
        classId: 'ai',
        durationMinutes: 60,
        subjectKey: 'ai',
      }),
    });
    assert(enroll3.status === 201, 'Third enrollment succeeds');
    const enrId3 = enroll3.body.enrollment.id;

    const noshow = await api(`/api/lessons/${enrId3}/no-show`, {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    assert(noshow.status === 200, 'No-show returns 200');

    const bal5 = await api('/api/credits/balance', { headers: authHeader(token) });
    assert(bal5.body.held === 0, 'No held credits after no-show');
    // Balance should be reduced by both cost2 and 60 (AI cost)
    const expected = 200 - cost2 - 60;
    assert(bal5.body.available === expected, `Balance after no-show = ${expected}`);

    // 10. Double-booking prevention via balance check
    console.log('\n-- Double-Booking Prevention --');
    // Drain balance
    const bigAdjust = await api('/api/admin/credits/adjust', {
      method: 'POST',
      headers: authHeader(adminToken),
      body: JSON.stringify({ userId, amount: -bal5.body.available + 10, reason: 'Drain for test' }),
    });
    const enroll4 = await api('/api/enroll', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tutorId: testTutorId,
        classId: 'ai',
        durationMinutes: 60,
        subjectKey: 'ai',
      }),
    });
    assert(enroll4.status === 402, 'Enroll with insufficient balance returns 402');
  }

  // 11. Public endpoints
  console.log('\n-- Public Endpoints --');
  const packs = await api('/api/credits/packs');
  assert(packs.status === 200, 'GET /api/credits/packs returns 200');
  assert(Array.isArray(packs.body.packs) && packs.body.packs.length >= 4, 'At least 4 seed packs');

  const rates = await api('/api/credits/rates');
  assert(rates.status === 200, 'GET /api/credits/rates returns 200');
  assert(Array.isArray(rates.body.rates) && rates.body.rates.length >= 8, 'At least 8 seed rates');
  assert(Array.isArray(rates.body.multipliers) && rates.body.multipliers.length >= 3, 'At least 3 duration multipliers');

  // 12. Ledger
  console.log('\n-- Ledger --');
  const ledger = await api('/api/credits/ledger', { headers: authHeader(token) });
  assert(ledger.status === 200, 'GET /api/credits/ledger returns 200');
  assert(Array.isArray(ledger.body.ledger), 'Ledger is an array');
  if (adminToken) {
    assert(ledger.body.ledger.length > 0, 'Ledger has entries after transactions');
  }

  // Summary
  console.log(`\n=============================`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`=============================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
