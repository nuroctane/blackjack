/**
 * Hand history + play grading.
 *
 * Every player decision is graded against the exact solver at the moment of
 * the decision: evLost = bestEV − chosenEV, in units of the original bet.
 * Rounds aggregate decisions, results, and net. Persisted locally, capped.
 * Utility for the player, not social noise.
 */

import type { Advice } from "./strategy";
import type { HandResult } from "./shoe";

export type DecisionRecord = {
  /** player cards at decision time, e.g. "10♠ 6♥" */
  hand: string;
  /** dealer upcard, e.g. "K♦" */
  up: string;
  action: Advice;
  best: Advice;
  /** EV given up vs the exact best action (≥ 0), per unit of original bet */
  evLost: number;
};

export type RoundRecord = {
  ts: number;
  hands: Array<{ cards: string; bet: number; result: HandResult }>;
  dealer: string;
  net: number;
  decisions: DecisionRecord[];
};

export type HistorySummary = {
  rounds: number;
  decisions: number;
  mistakes: number;
  accuracy: number; // 0..1 over graded decisions
  evLostTotal: number; // units of bet given up in total
};

const KEY = "ds_bj_history_v1";
const MAX_ROUNDS = 100;
/** EV ties within this epsilon are not mistakes (composition noise). */
export const MISTAKE_EPS = 0.002;

export function loadHistory(): RoundRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RoundRecord[];
    return Array.isArray(arr) ? arr.slice(-MAX_ROUNDS) : [];
  } catch {
    return [];
  }
}

export function appendRound(history: RoundRecord[], round: RoundRecord): RoundRecord[] {
  const next = [...history, round].slice(-MAX_ROUNDS);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }
  return next;
}

export function clearHistory(): RoundRecord[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }
  return [];
}

export function summarize(history: RoundRecord[]): HistorySummary {
  let decisions = 0;
  let mistakes = 0;
  let evLostTotal = 0;
  for (const r of history) {
    for (const d of r.decisions) {
      decisions += 1;
      if (d.evLost > MISTAKE_EPS) {
        mistakes += 1;
        evLostTotal += d.evLost;
      }
    }
  }
  return {
    rounds: history.length,
    decisions,
    mistakes,
    accuracy: decisions > 0 ? (decisions - mistakes) / decisions : 1,
    evLostTotal,
  };
}
