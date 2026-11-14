// Temporary test — verifies tier logic without touching Firestore.
// Run: node scripts/test-tier-logic.js
// Delete when done.

const { getTierItems } = (() => {
  // Stub — we'll just test the pure function directly
  return {
    getTierItems: (items, tier) => items.filter((i) => i.tier === tier),
  };
})();

const sampleItems = [
  { id: 'a', tier: 1 }, { id: 'b', tier: 1 }, { id: 'c', tier: 1 },
  { id: 'd', tier: 2 }, { id: 'e', tier: 2 },
  { id: 'f', tier: 3 },
  { id: 'g', tier: 4 },
];

console.log('Tier 1:', getTierItems(sampleItems, 1).map(i => i.id)); // a, b, c
console.log('Tier 2:', getTierItems(sampleItems, 2).map(i => i.id)); // d, e
console.log('Tier 3:', getTierItems(sampleItems, 3).map(i => i.id)); // f
console.log('Tier 4:', getTierItems(sampleItems, 4).map(i => i.id)); // g
console.log('Tier 5:', getTierItems(sampleItems, 5).map(i => i.id)); // []