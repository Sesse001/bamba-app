// scripts/set-admin.js
// One-time script: promote a user to admin role.
// Creates the user doc if missing (V1 users may not have V2 docs).
//
// Usage: node scripts/set-admin.js <UID>

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error('❌ Could not find serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const targetUid = process.argv[2];

if (!targetUid) {
  console.error('❌ Usage: node scripts/set-admin.js <UID>');
  console.error('   Find your UID at:');
  console.error('   https://console.firebase.google.com/project/linguacore-45ee6/firestore/data/users');
  process.exit(1);
}

async function main() {
  try {
    const ref = db.collection('users').doc(targetUid);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log('ℹ️  User doc not found. Creating with admin role...');
      await ref.set({
        uid: targetUid,
        role: 'admin',
        isGuest: false,
        onboarded: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        languages: [],
      });
      console.log('✅ Created user doc with role: admin');
      console.log('   UID:', targetUid);
      process.exit(0);
    }

    // Doc exists — just update role
    await ref.set(
      {
        role: 'admin',
      },
      { merge: true }
    );

    console.log('✅ Set role: admin for existing user', targetUid);
    console.log('   Current data:', {
      ...snap.data(),
      role: 'admin',
    });
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message || error);
    process.exit(1);
  }
}

main();