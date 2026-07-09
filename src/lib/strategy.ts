/**
 * Basic strategy advisor — standard multi-deck chart (H17 base, S17 deltas).
 *
 * Honest-math note: this is the published basic-strategy chart, not a
 * composition-dependent EV solve. It is labeled "chart" in the UI. Exact
 * quantities on the table (bust %, dealer distribution, stand EV) come from
 * shoe.ts combinatorics; this module only maps hand class → chart action.
 */

import {
  canDouble,
  canSplit,
  canSurrender,
  cardValue,
  handValue,
  type Rules,
  type TableState,
} from "./shoe";

export type Advice = "hit" | "stand" | "double" | "split" | "surrender";

type ChartAction = "H" | "S" | "Dh" | "Ds" | "P" | "Rh" | "Rs";

/** Dealer upcard column index: 2..9 → 0..7, ten-value → 8, ace → 9. */
function upIndex(upVal: number, upIsAce: boolean): number {
  if (upIsAce) return 9;
  if (upVal === 10) return 8;
  return upVal - 2;
}

function chartAction(
  cards: { rank: string }[],
  upVal: number,
  upIsAce: boolean,
  rules: Rules,
  splitAllowed: boolean,
): ChartAction {
  const u = upIndex(upVal, upIsAce);
  const h17 = rules.dealerHitsSoft17;
  const { total, soft } = handValue(cards as never);
  const pair =
    cards.length === 2 &&
    cardValue(cards[0].rank as never) === cardValue(cards[1].rank as never);

  if (pair && splitAllowed) {
    const v = cardValue(cards[0].rank as never);
    if (cards[0].rank === "A") return "P";
    if (v === 10) return "S";
    if (v === 9) return u <= 4 || u === 6 || u === 7 ? "P" : "S"; // 2-6,8,9 split; 7,10,A stand
    if (v === 8) return h17 && u === 9 && rules.lateSurrender ? "Rh" : "P";
    if (v === 7) return u <= 5 ? "P" : "H"; // 2-7
    if (v === 6) return (rules.doubleAfterSplit ? u <= 4 : u >= 1 && u <= 4) ? "P" : "H";
    if (v === 5) return u <= 7 ? "Dh" : "H"; // treat as hard 10
    if (v === 4) return rules.doubleAfterSplit && (u === 3 || u === 4) ? "P" : "H";
    if (v === 3 || v === 2)
      return (rules.doubleAfterSplit ? u <= 5 : u >= 2 && u <= 5) ? "P" : "H";
  }

  if (soft) {
    // total = 13..21 with an ace counted as 11
    if (total >= 20) return "S";
    if (total === 19) return h17 && u === 4 ? "Ds" : "S"; // A8 vs 6 double in H17
    if (total === 18) {
      if (h17 ? u <= 4 : u >= 1 && u <= 4) return "Ds"; // H17: 2-6, S17: 3-6
      if (u === 0 && !h17) return "S";
      if (u === 5 || u === 6) return "S"; // vs 7,8
      return "H"; // vs 9,10,A
    }
    if (total === 17) return u >= 1 && u <= 4 ? "Dh" : "H"; // vs 3-6
    if (total === 16 || total === 15) return u >= 2 && u <= 4 ? "Dh" : "H"; // vs 4-6
    return u >= 3 && u <= 4 ? "Dh" : "H"; // A2/A3 vs 5-6
  }

  // hard totals
  if (total >= 18) return "S";
  if (total === 17) return h17 && upIsAce && rules.lateSurrender ? "Rs" : "S";
  if (total === 16) {
    if (u >= 7 && rules.lateSurrender) return "Rh"; // vs 9,10,A
    return u <= 4 ? "S" : "H";
  }
  if (total === 15) {
    if ((u === 8 || (h17 && u === 9)) && rules.lateSurrender) return "Rh"; // vs 10 (and A in H17)
    return u <= 4 ? "S" : "H";
  }
  if (total === 14 || total === 13) return u <= 4 ? "S" : "H";
  if (total === 12) return u >= 2 && u <= 4 ? "S" : "H"; // vs 4-6
  if (total === 11) return h17 || !upIsAce ? "Dh" : "H"; // S17: hit vs A
  if (total === 10) return u <= 7 ? "Dh" : "H";
  if (total === 9) return u >= 1 && u <= 4 ? "Dh" : "H"; // vs 3-6
  return "H";
}

/** Advice for the active hand, with legality fallbacks applied. */
export function advise(state: TableState): Advice | null {
  if (state.phase !== "player") return null;
  const hand = state.hands[state.active];
  if (!hand || hand.done || state.dealer.length === 0) return null;
  const up = state.dealer[0];
  const upVal = cardValue(up.rank);
  const upIsAce = up.rank === "A";

  const action = chartAction(hand.cards, upVal, upIsAce, state.rules, canSplit(state));

  switch (action) {
    case "P":
      return canSplit(state) ? "split" : "hit";
    case "Dh":
      return canDouble(state) ? "double" : "hit";
    case "Ds":
      return canDouble(state) ? "double" : "stand";
    case "Rh":
      return canSurrender(state) ? "surrender" : "hit";
    case "Rs":
      return canSurrender(state) ? "surrender" : "stand";
    case "S":
      return "stand";
    default:
      return "hit";
  }
}

export const ADVICE_LABEL: Record<Advice, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender",
};
