/** Pure math helpers shared by the calculators and their fixture tests. */

export function combination(n, k) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= r; index += 1) {
    result = (result * (n - r + index)) / index;
  }
  return result;
}

export function hypergeometricPmf(deckSize, hits, draws, successes) {
  if (draws < 0 || deckSize <= 0) return 0;
  return (combination(hits, successes) * combination(deckSize - hits, draws - successes)) /
    combination(deckSize, draws);
}

export function probabilityAtLeast(deckSize, hits, draws, minimumHits = 1) {
  const lower = Math.max(minimumHits, 0);
  const upper = Math.min(hits, draws);
  let probability = 0;
  for (let successCount = lower; successCount <= upper; successCount += 1) {
    probability += hypergeometricPmf(deckSize, hits, draws, successCount);
  }
  return Math.min(1, Math.max(0, probability));
}

export function mulliganHitProbability(deckSize, hits, openingHand = 5) {
  const miss = hypergeometricPmf(deckSize, hits, openingHand, 0);
  return 1 - miss * miss;
}

export function counterRequired(attackerPower, defenderPower) {
  const gap = attackerPower - defenderPower + 1;
  return gap <= 0 ? 0 : Math.ceil(gap / 1000) * 1000;
}

function clonePool(pool) {
  return pool.map((entry) => ({ ...entry, count: Math.max(0, Math.floor(entry.count || 0)) }));
}

/**
 * Finds the least number of declared counter cards that reaches a requested
 * power amount. A tiny bounded DP beats a greedy approach when events have
 * non-standard values.
 */
export function minimumCounterCombination(required, pool) {
  if (required <= 0) return { cards: 0, total: 0, used: [] };
  const usable = clonePool(pool).filter((entry) => entry.value > 0 && entry.count > 0);
  let states = new Map([[0, { cards: 0, used: [] }]]);

  for (const entry of usable) {
    for (let copy = 0; copy < entry.count; copy += 1) {
      const next = new Map(states);
      for (const [sum, state] of states) {
        const newSum = sum + entry.value;
        const candidate = {
          cards: state.cards + 1,
          used: [...state.used, entry.name],
        };
        const current = next.get(newSum);
        if (!current || candidate.cards < current.cards) next.set(newSum, candidate);
      }
      states = next;
    }
  }

  let best = null;
  for (const [sum, state] of states) {
    if (sum < required) continue;
    if (!best || state.cards < best.cards || (state.cards === best.cards && sum < best.total)) {
      best = { ...state, total: sum };
    }
  }
  return best;
}

export function canCounter(attackerPower, defenderPower, pool) {
  const required = counterRequired(attackerPower, defenderPower);
  return {
    required,
    combination: minimumCounterCombination(required, pool),
  };
}

/** Exact multivariate-hypergeometric chance that an unknown hand can reach a counter target. */
export function counterHandProbability(required, deckSize, handSize, pool) {
  if (required <= 0) return 1;
  const types = clonePool(pool).filter((entry) => entry.value > 0 && entry.count > 0);
  const counted = types.reduce((total, entry) => total + entry.count, 0);
  if (deckSize <= 0 || handSize < 0 || counted > deckSize || handSize > deckSize) return 0;
  const denominator = combination(deckSize, handSize);
  let probability = 0;

  function visit(typeIndex, drawn, power, ways) {
    if (drawn > handSize) return;
    if (typeIndex === types.length) {
      const otherCards = deckSize - counted;
      const remaining = handSize - drawn;
      if (remaining < 0 || remaining > otherCards) return;
      if (power >= required) probability += (ways * combination(otherCards, remaining)) / denominator;
      return;
    }
    const type = types[typeIndex];
    const max = Math.min(type.count, handSize - drawn);
    for (let amount = 0; amount <= max; amount += 1) {
      visit(typeIndex + 1, drawn + amount, power + amount * type.value, ways * combination(type.count, amount));
    }
  }
  visit(0, 0, 0, 1);
  return Math.min(1, Math.max(0, probability));
}

function removeUsedCounters(pool, used) {
  const remaining = clonePool(pool);
  for (const name of used) {
    const candidate = remaining.find((entry) => entry.name === name && entry.count > 0);
    if (candidate) candidate.count -= 1;
  }
  return remaining;
}

export function allocateDonGreedy(attackers, availableDon) {
  const allocated = attackers
    .filter((attacker) => attacker.active !== false)
    .map((attacker) => ({ ...attacker, power: Number(attacker.power) + Number(attacker.modifier || 0), don: 0 }));
  let remaining = Math.max(0, Math.floor(availableDon || 0));
  const thresholds = [5000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];

  for (const threshold of thresholds) {
    for (const attacker of [...allocated].sort((a, b) => b.power - a.power)) {
      if (remaining === 0 || attacker.power >= threshold) continue;
      const donNeeded = Math.ceil((threshold - attacker.power) / 1000);
      const given = Math.min(donNeeded, remaining);
      attacker.power += given * 1000;
      attacker.don += given;
      remaining -= given;
    }
  }
  if (remaining > 0 && allocated.length > 0) {
    allocated.sort((a, b) => b.power - a.power)[0].power += remaining * 1000;
    allocated.sort((a, b) => b.power - a.power)[0].don += remaining;
    remaining = 0;
  }
  return allocated;
}

/**
 * This is intentionally a transparent heuristic, not a card-game solver:
 * it does not model blockers, triggers, On Attack effects, or new counters
 * drawn from Life. It tests the declared counter pool only.
 */
export function calculateLethal({ attackers, availableDon, leaderPower, life, counterPool }) {
  const allocated = allocateDonGreedy(attackers, availableDon);
  const sequence = [...allocated].sort((a, b) => b.power - a.power);
  let remainingLife = Math.max(0, Number(life));
  let pool = clonePool(counterPool);
  let lethalAt = null;
  const steps = sequence.map((attacker, index) => {
    const label = attacker.name || `Attacker ${index + 1}`;
    if (attacker.power < leaderPower) {
      return { label, power: attacker.power, don: attacker.don, status: 'below', required: 0, counter: null };
    }
    const required = counterRequired(attacker.power, leaderPower);
    const counter = minimumCounterCombination(required, pool);
    if (counter) {
      pool = removeUsedCounters(pool, counter.used);
      return { label, power: attacker.power, don: attacker.don, status: 'countered', required, counter };
    }
    const damage = Math.max(1, Number(attacker.damage || 1));
    if (damage > remainingLife && lethalAt === null) lethalAt = index;
    remainingLife = Math.max(0, remainingLife - damage);
    return { label, power: attacker.power, don: attacker.don, status: lethalAt === index ? 'lethal' : 'hits', required, damage };
  });

  return {
    allocated,
    steps,
    lethal: lethalAt !== null,
    unconditional: lethalAt !== null && Number(life) === 0,
    remainingLife,
    remainingPool: pool,
  };
}

export function formatPercent(value, digits = 1) {
  return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(digits)}%`;
}
