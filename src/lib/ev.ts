/**
 * Exact composition-dependent action EVs.
 *
 * Solves the player's decision by full expectimax over the live unseen-card
 * pool (shoe + hidden hole card), with depletion, memoized on remaining
 * composition. Dealer outcomes use the exact post-peek conditional
 * distribution from shoe.ts.
 *
 * Exactness contract:
 *   - stand, hit, double, surrender: EXACT for the current composition.
 *     Hit assumes optimal continuation (hit/stand) — the standard definition.
 *   - split: computed under the standard independence approximation
 *     (each split hand solved against the pool with the pair card removed;
 *     no resplit modeling; DAS and split-ace rules respected). Labeled ≈ in
 *     the UI. Everything else carries no approximation.
 *
 * All EVs are per unit of the ORIGINAL bet: stand/hit ∈ [-1, +1.5],
 * double ∈ [-2, +2], surrender = -0.5, split ∈ [-2, +2].
 */

import {
  canDouble,
  canSplit,
  canSurrender,
  cardValue,
  dealerDistFromCounts,
  handValue,
  shoeValueCounts,
  standEV,
  unseenPool,
  type Rules,
  type TableState,
} from "./shoe";
import type { Advice } from "./strategy";

export type ActionEVs = {
  stand: number;
  hit: number | null;
  double: number | null;
  split: number | null;
  surrender: number | null;
  best: Advice;
  bestEV: number;
  /** split EV uses the independence approximation; everything else is exact */
  splitApprox: boolean;
};

function classValue(i: number): number {
  return i === 0 ? 11 : i + 1;
}

function normalize(total: number, aces11: number): { total: number; aces11: number } {
  while (total > 21 && aces11 > 0) {
    total -= 10;
    aces11 -= 1;
  }
  return { total, aces11 };
}

class Solver {
  private counts: number[];
  private remaining: number;
  private readonly upVal: number;
  private readonly upIsAce: boolean;
  private readonly rules: Rules;
  private readonly distMemo = new Map<string, ReturnType<typeof dealerDistFromCounts>>();
  private readonly bestMemo = new Map<string, number>();

  constructor(upVal: number, upIsAce: boolean, counts: number[], rules: Rules) {
    this.counts = counts;
    this.remaining = counts.reduce((a, b) => a + b, 0);
    this.upVal = upVal;
    this.upIsAce = upIsAce;
    this.rules = rules;
  }

  private key(): string {
    return this.counts.join(".");
  }

  /** Exact dealer distribution for the current depleted composition. */
  private dist() {
    const k = this.key();
    let d = this.distMemo.get(k);
    if (!d) {
      d = dealerDistFromCounts(
        this.upVal,
        this.upIsAce,
        this.counts,
        this.remaining,
        this.rules,
        true,
      );
      this.distMemo.set(k, d);
    }
    return d;
  }

  evStand(total: number): number {
    if (total > 21) return -1;
    return standEV(total, this.dist());
  }

  /** max(stand, hit-with-optimal-continuation) for the current composition. */
  evBest(total: number, aces11: number): number {
    const n = normalize(total, aces11);
    if (n.total > 21) return -1;
    const soft = n.aces11 > 0 ? 1 : 0;
    const k = `${n.total}|${soft}|${this.key()}`;
    const memo = this.bestMemo.get(k);
    if (memo !== undefined) return memo;
    const standV = this.evStand(n.total);
    const hitV = n.total >= 21 ? -1 : this.evHit(n.total, n.aces11);
    const v = Math.max(standV, hitV);
    this.bestMemo.set(k, v);
    return v;
  }

  /** EV of taking exactly one more card, then continuing optimally. */
  evHit(total: number, aces11: number): number {
    if (this.remaining <= 0) return this.evStand(total);
    let ev = 0;
    for (let i = 0; i < 10; i++) {
      const c = this.counts[i];
      if (c === 0) continue;
      const p = c / this.remaining;
      this.counts[i] -= 1;
      this.remaining -= 1;
      const child = normalize(total + classValue(i), aces11 + (i === 0 ? 1 : 0));
      ev += p * (child.total > 21 ? -1 : this.evBest(child.total, child.aces11));
      this.counts[i] += 1;
      this.remaining += 1;
    }
    return ev;
  }

  /** EV of doubling: one forced card, forced stand, ±2 units. */
  evDouble(total: number, aces11: number): number {
    if (this.remaining <= 0) return 2 * this.evStand(total);
    let ev = 0;
    for (let i = 0; i < 10; i++) {
      const c = this.counts[i];
      if (c === 0) continue;
      const p = c / this.remaining;
      this.counts[i] -= 1;
      this.remaining -= 1;
      const child = normalize(total + classValue(i), aces11 + (i === 0 ? 1 : 0));
      ev += p * 2 * (child.total > 21 ? -1 : this.evStand(child.total));
      this.counts[i] += 1;
      this.remaining += 1;
    }
    return ev;
  }

  /**
   * ≈ EV of splitting a pair of `pairClass` (0 = aces): two independent hands,
   * each drawing its second card from the pool with one pair card removed.
   * No resplit modeling. DAS and one-card-split-aces rules respected.
   */
  evSplitApprox(pairClass: number): number {
    // Both pair cards are visible in the player's hand, so the unseen pool
    // already excludes them. Each hand draws its second card from that pool;
    // the independence approximation ignores cross-hand depletion beyond it.
    let perHand = 0;
    if (this.remaining <= 0) return 0;
    for (let i = 0; i < 10; i++) {
      const c = this.counts[i];
      if (c === 0) continue;
      const p = c / this.remaining;
      this.counts[i] -= 1;
      this.remaining -= 1;
      const anchor = classValue(pairClass);
      const drawn = classValue(i);
      const start = normalize(anchor + drawn, (pairClass === 0 ? 1 : 0) + (i === 0 ? 1 : 0));
      let handEV: number;
      if (pairClass === 0 && !this.rules.hitSplitAces) {
        // split aces: one card, forced stand
        handEV = this.evStand(start.total);
      } else {
        const best = this.evBest(start.total, start.aces11);
        if (this.rules.doubleAfterSplit && this.doubleLegalAfterSplit(start.total, start.aces11)) {
          handEV = Math.max(best, this.evDouble(start.total, start.aces11));
        } else {
          handEV = best;
        }
      }
      perHand += p * handEV;
      this.counts[i] += 1;
      this.remaining += 1;
    }
    return 2 * perHand;
  }

  private doubleLegalAfterSplit(total: number, aces11: number): boolean {
    const soft = aces11 > 0;
    if (this.rules.doubleAllowed === "9to11") return !soft && total >= 9 && total <= 11;
    if (this.rules.doubleAllowed === "10to11") return !soft && total >= 10 && total <= 11;
    return true;
  }
}

/**
 * Solve every legal action for the active hand from the player's perspective.
 * Returns null outside the player phase.
 */
export function solveActions(state: TableState): ActionEVs | null {
  if (state.phase !== "player") return null;
  const hand = state.hands[state.active];
  if (!hand || hand.done || state.dealer.length === 0) return null;

  const pool = unseenPool(state);
  const counts = shoeValueCounts(pool);
  const up = state.dealer[0];
  const solver = new Solver(cardValue(up.rank), up.rank === "A", counts, state.rules);

  const { total, soft } = handValue(hand.cards);
  let aces11 = 0;
  {
    // reconstruct aces-as-11 from soft flag (post-normalize it is 0 or 1)
    aces11 = soft ? 1 : 0;
  }

  const stand = solver.evStand(total);
  const hit = total >= 21 ? null : solver.evHit(total, aces11);
  const double = canDouble(state) ? solver.evDouble(total, aces11) : null;
  const surrender = canSurrender(state) ? -0.5 : null;
  let split: number | null = null;
  if (canSplit(state)) {
    const v = cardValue(hand.cards[0].rank);
    const pairClass = hand.cards[0].rank === "A" ? 0 : v === 10 ? 9 : v - 1;
    split = solver.evSplitApprox(pairClass);
  }

  const candidates: Array<[Advice, number]> = [["stand", stand]];
  if (hit !== null) candidates.push(["hit", hit]);
  if (double !== null) candidates.push(["double", double]);
  if (split !== null) candidates.push(["split", split]);
  if (surrender !== null) candidates.push(["surrender", surrender]);
  candidates.sort((a, b) => b[1] - a[1]);
  const [best, bestEV] = candidates[0];

  return { stand, hit, double, split, surrender, best, bestEV, splitApprox: split !== null };
}
