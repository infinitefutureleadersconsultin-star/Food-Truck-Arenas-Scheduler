#!/usr/bin/env node

/**
 * set-admin.mjs
 *
 * Sets Firebase custom claims (role: 'admin', status: 'active') for the admin
 * user and updates the corresponding Firestore user document.
 *
 * Usage:
 *   node scripts/set-admin.mjs
 *
 * Requirements:
 *   - firebase-admin must be installed (`npm i -D firebase-admin`)
 *   - Service account JSON at the project root (or set GOOGLE_APPLICATION_CREDENTIALS)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ----- Configuration -----
const ADMIN_EMAIL = 'Foodtruckarenas@gmail.com';
const SERVICE_ACCOUNT_FILENAME = 'food-truck-arenas-firebase-adminsdk-fbsvc-cc660a70b4.json';

// ----- Locate service account key -----
const keyPath = resolve(ROOT, SERVICE_ACCOUNT_FILENAME);
if (!existsSync(keyPath)) {
  console.error(`\nService account key not found at:\n  ${keyPath}\n`);
  console.error(
    'Please download it from the Firebase Console:\n' +
    '  Project Settings -> Service accounts -> Generate new private key\n' +
    `and save it as "${SERVICE_ACCOUNT_FILENAME}" in the project root.\n`
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

// ----- Initialize Firebase Admin -----
const app = initializeApp({
  credential: cert(serviceAccount),
});

const authAdmin = getAuth(app);
const dbAdmin = getFirestore(app);

async function main() {
  console.log(`\nLooking up user by email: ${ADMIN_EMAIL}...`);

  let userRecord;
  try {
    userRecord = await authAdmin.getUserByEmail(ADMIN_EMAIL);
  } catch (err) {
    console.error(`Failed to find user with email "${ADMIN_EMAIL}":`, err.message);
    process.exit(1);
  }

  console.log(`  Found user: ${userRecord.uid} (${userRecord.displayName || 'no display name'})`);

  // ----- Set custom claims -----
  console.log('Setting custom claims: { role: "admin", status: "active" }...');
  await authAdmin.setCustomUserClaims(userRecord.uid, {
    role: 'admin',
    status: 'active',
  });
  console.log('  Custom claims set.');

  // ----- Update Firestore user document -----
  console.log('Updating Firestore users document...');
  const userDocRef = dbAdmin.collection('users').doc(userRecord.uid);
  const userDoc = await userDocRef.get();

  if (userDoc.exists) {
    await userDocRef.update({
      role: 'admin',
      status: 'active',
    });
    console.log('  Firestore document updated.');
  } else {
    await userDocRef.set({
      id: userRecord.uid,
      email: ADMIN_EMAIL,
      displayName: userRecord.displayName || 'Admin',
      businessName: 'Food Truck Arena',
      phone: '',
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
    });
    console.log('  Firestore document created (did not exist).');
  }

  console.log(`\nDone! ${ADMIN_EMAIL} is now an admin.\n`);
  console.log('IMPORTANT: The user must sign out and sign back in for');
  console.log('the new custom claims to take effect in their ID token.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
