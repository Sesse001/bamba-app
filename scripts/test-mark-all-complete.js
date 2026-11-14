// scripts/test-mark-all-complete.js
// TEMPORARY — marks all Tier 2, 3, 4 items as completed for the current user.
// Use to test the "Redo skipped cards" flow. REVERT after.

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TEST_UID = process.argv[2];
if (!TEST_UID) {
  console.error('Usage: node scripts/test-mark-all-complete.js <UID>');
  process.exit(1);
}

async function main() {
  const allItems = await db.collection('learning_content')
    .where('languageId', '==', 'zu')
    .get();

  let count = 0;
  for (const item of allItems.docs) {
    const data = item.data();
    if (data.tier >= 2) {
      await db.collection('users').doc(TEST_UID)
        .collection('progress').doc(item.id)
        .set({
          contentId: item.id,
          seen: true,
          attempts: 1,
          completed: true,
          skipped: false,
          firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      count++;
    }
  }

  console.log(`Marked ${count} Tier 2-4 items as completed for user ${TEST_UID}`);
  console.log('Reload app — Home should show "All tiers complete!"');
  console.log('You can then test the "Redo skipped cards" flow.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});