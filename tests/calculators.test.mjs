import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLethal,
  counterHandProbability,
  counterRequired,
  minimumCounterCombination,
  mulliganHitProbability,
  probabilityAtLeast,
} from '../src/lib/calculators.js';

test('four copies in fifty cards, five looks, is about 35.3%', () => {
  const probability = probabilityAtLeast(50, 4, 5);
  assert.ok(Math.abs(probability - 0.353045) < 0.0001);
});

test('a mulligan increases opening five success odds', () => {
  assert.ok(mulliganHitProbability(50, 4, 5) > probabilityAtLeast(50, 4, 5));
});

test('tied power needs one 1000 counter because attacks win ties', () => {
  assert.equal(counterRequired(5000, 5000), 1000);
  assert.deepEqual(minimumCounterCombination(3000, [
    { name: '2k', value: 2000, count: 2 },
    { name: '1k', value: 1000, count: 2 },
  ]), { cards: 2, total: 3000, used: ['2k', '1k'] });
});

test('lethal fixture: a second 5k attack ends a zero-life game after one known 1k counter', () => {
  const result = calculateLethal({
    attackers: [
      { name: 'Leader', power: 5000 },
      { name: 'Character', power: 5000 },
    ],
    availableDon: 0,
    leaderPower: 5000,
    life: 0,
    counterPool: [{ name: '1000 Counter', value: 1000, count: 1 }],
  });
  assert.equal(result.lethal, true);
  assert.equal(result.unconditional, true);
  assert.equal(result.steps[0].status, 'countered');
  assert.equal(result.steps[1].status, 'lethal');
});

test('unknown-hand counter chance is exact for a one-card deck', () => {
  assert.equal(counterHandProbability(2000, 1, 1, [{ name: '2k', value: 2000, count: 1 }]), 1);
  assert.equal(counterHandProbability(2000, 1, 1, [{ name: '1k', value: 1000, count: 1 }]), 0);
});
