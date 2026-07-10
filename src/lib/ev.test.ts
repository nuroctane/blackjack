/**
 * Node-runnable solver tests: npx tsx src/lib/ev.test.ts
 *
 * Validates the exact EV solver against canonical basic-strategy spots and
 * published EV magnitudes, checks player-perspective pool math, and guards
 * performance on the deepest recursion.
 */
import {
  DEFAULT_RULES,
  dealerOutcomeDist,
  freshShoe,
  newTable,
  unseenPool,
  type Card,
  type TableState,
} from "./shoe";
import { solveActions } from "./ev";
import { appendRound, clearHistory, MISTAKE_EPS, summarize, type RoundRecord } from "./history";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const C = (rank: Card["rank"], suit: Card["suit"] = "♠"): Card => ({
  rank,
  suit,
  id: `${rank}${suit}${Math.random()}`,
});

function scenario(player: Card[], up: Card, hole: Card, rules = DEFAULT_RULES): TableState {
  const base = newTable(rules, 1000);
  const removeOne = (shoe: Card[], rank: string) => {
    const i = shoe.findIndex((c) => c.rank === rank);
    return i >= 0 ? [...shoe.slice(0, i), ...shoe.slice(i + 1)] : shoe;
  };
  let shoe = base.shoe;
  for (const c of [...player, up, hole]) shoe = removeOne(shoe, c.rank);
  return {
    ...base,
    shoe,
    phase: "player",
    hands: [
      {
        cards: player,
        bet: 25,
        doubled: false,
        surrendered: false,
        fromSplit: false,
        splitAces: false,
        done: false,
        result: null,
      },
    ],
    active: 0,
    dealer: [up, hole],
    bankroll: 975,
  };
}

// canonical spots: solver must agree with basic strategy
const spots: Array<[string, Card[], Card, string]> = [
  ["hard 16 vs 10", [C("10"), C("6")], C("K"), "surrender"],
  ["hard 11 vs 6", [C("6"), C("5")], C("6"), "double"],
  ["hard 20 vs 6", [C("10"), C("Q")], C("6"), "stand"],
  ["pair 8s vs 6", [C("8"), C("8", "♥")], C("6"), "split"],
  ["pair As vs 10", [C("A"), C("A", "♥")], C("K"), "split"],
  ["hard 12 vs 2", [C("10"), C("2")], C("2"), "hit"],
  ["soft 18 vs 9", [C("A"), C("7")], C("9"), "hit"],
  ["hard 9 vs 3", [C("4"), C("5")], C("3"), "double"],
  ["pair 10s vs 6", [C("10"), C("Q", "♥")], C("6"), "stand"], // never split tens
];
for (const [name, player, up, expect] of spots) {
  const ev = solveActions(scenario(player, up, C("9", "♦")));
  assert(ev, `${name}: solver returned`);
  assert(ev!.best === expect, `${name}: expected ${expect}, got ${ev!.best}`);
}

// EV magnitudes near published values (fresh 6-deck, ±0.03 tolerance)
{
  const ev = solveActions(scenario([C("10"), C("6")], C("K"), C("9", "♦")))!;
  assert(Math.abs(ev.hit! - -0.535) < 0.03, `16v10 hit EV ≈ −0.54 (got ${ev.hit})`);
  assert(ev.surrender === -0.5, "surrender is exactly −0.5");
  const d11 = solveActions(scenario([C("6"), C("5")], C("6"), C("9", "♦")))!;
  assert(Math.abs(d11.double! - 0.67) < 0.05, `11v6 double EV ≈ +0.67 (got ${d11.double})`);
  assert(d11.double! > d11.hit!, "11v6: double beats hit");
}

// solver EV bounds
{
  const ev = solveActions(scenario([C("10"), C("Q")], C("6"), C("9", "♦")))!;
  assert(ev.stand >= -1 && ev.stand <= 1.5, "stand within bounds");
  assert(ev.double === null || (ev.double >= -2 && ev.double <= 2), "double within bounds");
}

// unseen pool: hidden hole card is part of player-perspective composition
{
  const s = scenario([C("10"), C("6")], C("K"), C("9", "♦"));
  const pool = unseenPool(s);
  assert(pool.length === s.shoe.length + 1, "pool = shoe + hidden hole");
  const revealed = { ...s, phase: "settled" as const };
  assert(unseenPool(revealed).length === s.shoe.length, "no hole in pool once revealed");
}

// conditional dealer dist over pool still sums to 1
{
  const shoe = freshShoe(6);
  const dist = dealerOutcomeDist(C("A", "♦"), shoe, DEFAULT_RULES, true);
  const sum = dist.p17 + dist.p18 + dist.p19 + dist.p20 + dist.p21 + dist.bust;
  assert(Math.abs(sum - 1) < 1e-9, "ace-up conditional dist sums to 1");
}

// determinism
{
  const s = scenario([C("8"), C("8", "♥")], C("6"), C("9", "♦"));
  const a = solveActions(s)!;
  const b = solveActions(s)!;
  assert(a.split === b.split && a.hit === b.hit && a.stand === b.stand, "solver deterministic");
}

// performance guard: deepest practical recursion stays interactive
{
  const t0 = Date.now();
  solveActions(scenario([C("2"), C("3")], C("K"), C("9", "♦")));
  solveActions(scenario([C("A"), C("A", "♥")], C("6"), C("9", "♦")));
  const ms = Date.now() - t0;
  assert(ms < 2000, `worst-case solves stay interactive (${ms}ms)`);
}

// history grading
{
  clearHistory();
  const round: RoundRecord = {
    ts: Date.now(),
    hands: [{ cards: "10♠ 6♥", bet: 25, result: "lose" }],
    dealer: "K♦ 9♣",
    net: -25,
    decisions: [
      { hand: "10♠ 6♥", up: "K♦", action: "hit", best: "surrender", evLost: 0.035 },
      { hand: "10♠ 6♥ 4♦", up: "K♦", action: "stand", best: "stand", evLost: 0 },
    ],
  };
  const h = appendRound([], round);
  const sum = summarize(h);
  assert(sum.rounds === 1 && sum.decisions === 2, "history counts");
  assert(sum.mistakes === 1, "one mistake graded");
  assert(sum.accuracy === 0.5, "accuracy 50%");
  assert(Math.abs(sum.evLostTotal - 0.035) < 1e-9, "EV lost totaled");
  assert(MISTAKE_EPS > 0, "epsilon defined");
  clearHistory();
}

console.log("ev.test.ts: all passed");
