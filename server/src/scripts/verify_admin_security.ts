const BASE_URL = 'http://localhost:5000/api';
const MASTER_KEY = 'EC-ROYAL-ATELIER-7K9F-2026-X8Q2';

async function postJson(endpoint: string, body: any): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

async function runVerification() {
  console.log('\n======================================================');
  console.log('🛡️  ETHNIZCOUTURE ADMIN PORTAL SECURITY HEALTH CHECK');
  console.log('======================================================\n');

  let passedTests = 0;
  const totalTests = 4;

  // Test 1: Reject missing passkey
  process.stdout.write('Test 1: Reject login without Secret Passkey... ');
  const res1 = await postJson('/auth/admin-login', {
    email: 'admin@ethnizcouture.com',
    password: 'Admin@123456'
  });
  if (res1.status === 400) {
    console.log('✅ PASSED (HTTP 400: Passkey is required)');
    passedTests++;
  } else {
    console.log(`❌ FAILED (status: ${res1.status})`);
  }

  // Test 2: Reject wrong passkey
  process.stdout.write('Test 2: Reject login with incorrect Secret Passkey... ');
  const res2 = await postJson('/auth/admin-login', {
    email: 'admin@ethnizcouture.com',
    password: 'Admin@123456',
    masterKey: 'FAKE-INVALID-PASSKEY-1234'
  });
  if (res2.status === 403) {
    console.log('✅ PASSED (HTTP 403: Invalid Atelier Secret Passkey)');
    passedTests++;
  } else {
    console.log(`❌ FAILED (status: ${res2.status})`);
  }

  // Test 3: Reject wrong password even with valid passkey
  process.stdout.write('Test 3: Reject login with wrong admin password... ');
  const res3 = await postJson('/auth/admin-login', {
    email: 'admin@ethnizcouture.com',
    password: 'WrongPassword@999',
    masterKey: MASTER_KEY
  });
  if (res3.status === 401) {
    console.log('✅ PASSED (HTTP 401: Invalid administrator credentials)');
    passedTests++;
  } else {
    console.log(`❌ FAILED (status: ${res3.status})`);
  }

  // Test 4: Full clearance with valid Admin + Password + Secret Passkey
  process.stdout.write('Test 4: Authenticate Uncle Admin with valid credentials & Passkey... ');
  const res4 = await postJson('/auth/admin-login', {
    email: 'admin@ethnizcouture.com',
    password: 'Admin@123456',
    masterKey: MASTER_KEY
  });
  if (res4.status === 200 && res4.data.token && res4.data.user?.role === 'ADMIN') {
    console.log('✅ PASSED (HTTP 200: Authorized!)');
    console.log(`   → User: ${res4.data.user.name} (${res4.data.user.email})`);
    console.log(`   → Role: ${res4.data.user.role}`);
    console.log(`   → Token: ${res4.data.token.slice(0, 20)}...`);
    passedTests++;
  } else {
    console.log(`❌ FAILED (status: ${res4.status})`);
  }

  console.log('\n------------------------------------------------------');
  if (passedTests === totalTests) {
    console.log(`🎯 ALL ${passedTests}/${totalTests} SECURITY CHECKS PASSED PERFECTLY!`);
  } else {
    console.log(`⚠️  ${passedTests}/${totalTests} tests passed.`);
  }
  console.log('------------------------------------------------------\n');
}

runVerification().catch(console.error);
