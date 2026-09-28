// scripts/seed.js
// Bamba V2 — one-time seed for languages + demo learning content.
//
// IDEMPOTENT: uses deterministic IDs. Running twice = no duplicates.
//
// Run with:   node scripts/seed.js
//
// Uses the Firebase client SDK (same config as the app).
// Firestore rules currently allow open writes during dev — safe for this script.

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDtK1tggcJkQcLQUJ7fANsSBbRhHzw3U28",
  authDomain: "linguacore-45ee6.firebaseapp.com",
  projectId: "linguacore-45ee6",
  storageBucket: "linguacore-45ee6.firebasestorage.app",
  messagingSenderId: "1074135238590",
  appId: "1:1074135238590:web:5bac09ccc5df75891a1bef",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─────────────────────────────────────────────────────────────
// LANGUAGE SEED DATA
// ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  {
    id: 'zu',
    code: 'zu',
    name: 'isiZulu',
    nativeName: 'isiZulu',
    family: 'Nguni',
    status: 'demo',
    regions: ['KwaZulu-Natal', 'Gauteng'],
  },
  {
    id: 'st',
    code: 'st',
    name: 'Sesotho',
    nativeName: 'Sesotho',
    family: 'Sotho-Tswana',
    status: 'demo',
    regions: ['Free State', 'Gauteng', 'Limpopo'],
  },
  {
    id: 'ts',
    code: 'ts',
    name: 'Xitsonga',
    nativeName: 'Xitsonga',
    family: 'Tswa-Ronga',
    status: 'demo',
    regions: ['Limpopo', 'Mpumalanga'],
  },
];

// ─────────────────────────────────────────────────────────────
// LEARNING CONTENT SEED DATA
// ─────────────────────────────────────────────────────────────
//
// Each item is a prompt with 1–3 curated translations.
// IDs are deterministic: {lang}_{type}_{slug}
//
// IMPORTANT: all items are isDemo=true — clearly labeled as prototype content,
// not research-validated language data.

const CONTENT = [
  // ─── isiZulu ────────────────────────────────────────────────
  {
    id: 'zu_greeting_hello',
    languageId: 'zu',
    type: 'word',
    prompt: 'Hello',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 1,
    translations: [
      { id: 'zu_greeting_hello_sawubona', text: 'Sawubona', status: 'reviewed', register: 'formal' },
      { id: 'zu_greeting_hello_sanibonani', text: 'Sanibonani', status: 'reviewed', register: 'formal' },
    ],
  },
  {
    id: 'zu_greeting_hi_casual',
    languageId: 'zu',
    type: 'word',
    prompt: 'Hi (casual)',
    difficulty: 1,
    tags: ['greeting', 'casual'],
    lessonId: 'lesson_01_basics',
    order: 2,
    translations: [
      { id: 'zu_greeting_hi_casual_he', text: 'He', status: 'community_supported', register: 'casual' },
    ],
  },
  {
    id: 'zu_greeting_thank_you',
    languageId: 'zu',
    type: 'phrase',
    prompt: 'Thank you',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 3,
    translations: [
      { id: 'zu_greeting_thank_you_ngiyabonga', text: 'Ngiyabonga', status: 'reviewed' },
    ],
  },
  {
    id: 'zu_greeting_goodbye',
    languageId: 'zu',
    type: 'word',
    prompt: 'Goodbye',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 4,
    translations: [
      { id: 'zu_greeting_goodbye_sala_kahle', text: 'Sala kahle', status: 'reviewed', region: 'KwaZulu-Natal' },
      { id: 'zu_greeting_goodbye_hamba_kahle', text: 'Hamba kahle', status: 'reviewed', region: 'KwaZulu-Natal' },
    ],
  },
  {
    id: 'zu_phrase_how_are_you',
    languageId: 'zu',
    type: 'phrase',
    prompt: 'How are you?',
    difficulty: 2,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 5,
    translations: [
      { id: 'zu_phrase_how_are_you_unjeni', text: 'Unjani?', status: 'reviewed' },
    ],
  },
  {
    id: 'zu_phrase_i_am_fine',
    languageId: 'zu',
    type: 'phrase',
    prompt: "I'm fine",
    difficulty: 2,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 6,
    translations: [
      { id: 'zu_phrase_i_am_fine_ngiyaphila', text: 'Ngiyaphila', status: 'reviewed' },
    ],
  },
  {
    id: 'zu_word_water',
    languageId: 'zu',
    type: 'word',
    prompt: 'Water',
    difficulty: 1,
    tags: ['food', 'daily'],
    lessonId: 'lesson_02_everyday',
    order: 7,
    translations: [
      { id: 'zu_word_water_amanzi', text: 'Amanzi', status: 'reviewed' },
    ],
  },
  {
    id: 'zu_word_food',
    languageId: 'zu',
    type: 'word',
    prompt: 'Food',
    difficulty: 1,
    tags: ['food', 'daily'],
    lessonId: 'lesson_02_everyday',
    order: 8,
    translations: [
      { id: 'zu_word_food_ukudla', text: 'Ukudla', status: 'reviewed' },
    ],
  },
  {
    id: 'zu_phrase_go_home',
    languageId: 'zu',
    type: 'sentence',
    prompt: "I'm going home now",
    difficulty: 3,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 9,
    translations: [
      { id: 'zu_phrase_go_home_ngiya_ehaya', text: 'Ngiya ekhaya manje', status: 'reviewed' },
    ],
  },
  {
    id: 'zu_word_yes',
    languageId: 'zu',
    type: 'word',
    prompt: 'Yes',
    difficulty: 1,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 10,
    translations: [
      { id: 'zu_word_yes_yebo', text: 'Yebo', status: 'reviewed' },
    ],
  },

  // ─── Sesotho ───────────────────────────────────────────────
  {
    id: 'st_greeting_hello',
    languageId: 'st',
    type: 'word',
    prompt: 'Hello',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 1,
    translations: [
      { id: 'st_greeting_hello_dumela', text: 'Dumela', status: 'reviewed' },
      { id: 'st_greeting_hello_lumela', text: 'Lumela', status: 'regional_variant', region: 'Lesotho' },
    ],
  },
  {
    id: 'st_greeting_thank_you',
    languageId: 'st',
    type: 'phrase',
    prompt: 'Thank you',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 2,
    translations: [
      { id: 'st_greeting_thank_you_kea_lebohela', text: 'Kea leboha', status: 'reviewed' },
    ],
  },
  {
    id: 'st_greeting_goodbye',
    languageId: 'st',
    type: 'phrase',
    prompt: 'Goodbye',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 3,
    translations: [
      { id: 'st_greeting_goodbye_sala_hantle', text: 'Sala hantle', status: 'reviewed' },
    ],
  },
  {
    id: 'st_phrase_how_are_you',
    languageId: 'st',
    type: 'phrase',
    prompt: 'How are you?',
    difficulty: 2,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 4,
    translations: [
      { id: 'st_phrase_how_are_you_o_kae', text: 'O kae?', status: 'reviewed' },
    ],
  },
  {
    id: 'st_phrase_i_am_fine',
    languageId: 'st',
    type: 'phrase',
    prompt: "I'm fine",
    difficulty: 2,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 5,
    translations: [
      { id: 'st_phrase_i_am_fine_ke_teng', text: 'Ke teng', status: 'reviewed' },
    ],
  },
  {
    id: 'st_word_water',
    languageId: 'st',
    type: 'word',
    prompt: 'Water',
    difficulty: 1,
    tags: ['food', 'daily'],
    lessonId: 'lesson_02_everyday',
    order: 6,
    translations: [
      { id: 'st_word_water_metsi', text: 'Metsi', status: 'reviewed' },
    ],
  },
  {
    id: 'st_word_food',
    languageId: 'st',
    type: 'word',
    prompt: 'Food',
    difficulty: 1,
    tags: ['food', 'daily'],
    lessonId: 'lesson_02_everyday',
    order: 7,
    translations: [
      { id: 'st_word_food_lijo', text: 'Lijo', status: 'reviewed' },
    ],
  },
  {
    id: 'st_phrase_go_home',
    languageId: 'st',
    type: 'sentence',
    prompt: "I'm going home now",
    difficulty: 3,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 8,
    translations: [
      { id: 'st_phrase_go_home_ke_ya_hae', text: 'Ke ya hae jwale', status: 'reviewed' },
    ],
  },
  {
    id: 'st_word_yes',
    languageId: 'st',
    type: 'word',
    prompt: 'Yes',
    difficulty: 1,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 9,
    translations: [
      { id: 'st_word_yes_e', text: 'E', status: 'reviewed' },
    ],
  },
  {
    id: 'st_word_no',
    languageId: 'st',
    type: 'word',
    prompt: 'No',
    difficulty: 1,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 10,
    translations: [
      { id: 'st_word_no_che', text: 'Che', status: 'reviewed' },
    ],
  },

  // ─── Xitsonga ──────────────────────────────────────────────
  {
    id: 'ts_greeting_hello',
    languageId: 'ts',
    type: 'word',
    prompt: 'Hello',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 1,
    translations: [
      { id: 'ts_greeting_hello_avuxeni', text: 'Avuxeni', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_greeting_thank_you',
    languageId: 'ts',
    type: 'phrase',
    prompt: 'Thank you',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 2,
    translations: [
      { id: 'ts_greeting_thank_you_ndza_khensa', text: 'Ndza khensa', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_greeting_goodbye',
    languageId: 'ts',
    type: 'phrase',
    prompt: 'Goodbye',
    difficulty: 1,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 3,
    translations: [
      { id: 'ts_greeting_goodbye_salani', text: 'Salani kahle', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_phrase_how_are_you',
    languageId: 'ts',
    type: 'phrase',
    prompt: 'How are you?',
    difficulty: 2,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 4,
    translations: [
      { id: 'ts_phrase_how_are_you_ku_njani', text: 'Ku njhani?', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_phrase_i_am_fine',
    languageId: 'ts',
    type: 'phrase',
    prompt: "I'm fine",
    difficulty: 2,
    tags: ['greeting', 'daily'],
    lessonId: 'lesson_01_basics',
    order: 5,
    translations: [
      { id: 'ts_phrase_i_am_fine_ndzi_hanya', text: 'Ndzi hanya kahle', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_word_water',
    languageId: 'ts',
    type: 'word',
    prompt: 'Water',
    difficulty: 1,
    tags: ['food', 'daily'],
    lessonId: 'lesson_02_everyday',
    order: 6,
    translations: [
      { id: 'ts_word_water_mati', text: 'Mati', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_word_food',
    languageId: 'ts',
    type: 'word',
    prompt: 'Food',
    difficulty: 1,
    tags: ['food', 'daily'],
    lessonId: 'lesson_02_everyday',
    order: 7,
    translations: [
      { id: 'ts_word_food_swakudya', text: 'Swakudya', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_phrase_go_home',
    languageId: 'ts',
    type: 'sentence',
    prompt: "I'm going home now",
    difficulty: 3,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 8,
    translations: [
      { id: 'ts_phrase_go_home_ndzi_ya_ekaya', text: 'Ndzi ya ekaya sweswi', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_word_yes',
    languageId: 'ts',
    type: 'word',
    prompt: 'Yes',
    difficulty: 1,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 9,
    translations: [
      { id: 'ts_word_yes_ina', text: 'Ina', status: 'reviewed' },
    ],
  },
  {
    id: 'ts_word_no',
    languageId: 'ts',
    type: 'word',
    prompt: 'No',
    difficulty: 1,
    tags: ['daily'],
    lessonId: 'lesson_02_everyday',
    order: 10,
    translations: [
      { id: 'ts_word_no_e_e', text: 'E-e', status: 'reviewed' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// SEED LOGIC
// ─────────────────────────────────────────────────────────────

async function seedLanguages() {
  console.log(`\n📚 Seeding ${LANGUAGES.length} languages...`);
  for (const lang of LANGUAGES) {
    const { id, ...data } = lang;
    const ref = doc(db, 'languages', id);
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`   ✅ ${id} — ${data.name}`);
  }
}

async function seedContent() {
  console.log(`\n📝 Seeding ${CONTENT.length} learning content items...`);
  let contentCount = 0;
  let translationCount = 0;

  for (const item of CONTENT) {
    const { id, translations, ...contentData } = item;

    // Parent doc
    const contentRef = doc(db, 'learning_content', id);
    await setDoc(contentRef, {
      ...contentData,
      isDemo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    contentCount++;

    // Translations subcollection
    for (const t of translations) {
      const { id: tId, ...tData } = t;
      const tRef = doc(db, 'learning_content', id, 'translations', tId);
      await setDoc(tRef, {
        ...tData,
        isDemo: true,
        submittedBy: null,
        reviewedBy: null,
        createdAt: serverTimestamp(),
      }, { merge: true });
      translationCount++;
    }
  }

  console.log(`   ✅ ${contentCount} content items`);
  console.log(`   ✅ ${translationCount} translations`);
}

async function main() {
  console.log('🌱 Bamba V2 — Seed script');
  console.log('═══════════════════════════════════════════');
  console.log('Idempotent: safe to re-run. Deterministic IDs.');
  console.log('═══════════════════════════════════════════');

  try {
    await seedLanguages();
    await seedContent();

    console.log('\n🎉 Seed complete.');
    console.log('\nVerify in Firebase Console:');
    console.log('  https://console.firebase.google.com/project/linguacore-45ee6/firestore/data');
    console.log('\nExpected collections:');
    console.log('  languages/                    (3 docs)');
    console.log('  learning_content/             (30 docs)');
    console.log('  learning_content/*/translations  (31 docs)');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message || error);
    process.exit(1);
  }
}

main();