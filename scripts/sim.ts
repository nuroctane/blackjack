/**
 * Simulation harness — plays N hands with a chosen policy and reports the
 * realized edge. Usage:
 *
 *   npx tsx scripts/sim.ts [hands] [policy]
 *   npm run sim                      # 20000 hands, solver policy
 *   npm run sim -- 50000 chart      # 50k hands, chart policy
 *
 * Policies: "solver" (exact composition-dependent EV) | "chart" (basic strategy).
 * Expected long-run edge for 6D H17 DAS LS ≈ −0.6%; the solver policy should
 * land slightly better than chart as penetration deepens.
 */

import {
  canDouble,
  canSplit,
  canSurrender,
  deal,
  declineInsurance,
  DEFAULT_RULES,
  doubleDown,
  hit,
  newTable,
  nextRound,
  split,
  stand,
  surrender,
} from "../src/lib/shoe";
import { advise } from "../src/lib/strategy";
import { solveActions } from "../src/lib/ev";

const HANDS = Number(process.argv[2]) || 20000;
const POLICY = (process.argv[3] || "solver") as "solver" | "chart";

let s = newTable(DEFAULT_RULES, 10_000_000);
let staked = 0;
const start = Date.now();

for (let i = 0; i < HANDS; i++) {
  s = { ...s, bet: 10 };
  s = deal(s);
  if (s.phase === "insurance") s = declineInsurance(s); // insurance is −EV without a count trigger
  let guard = 0;
  while (s.phase === "player" && guard++ < 60) {
    let action: string | null = null;
    if (POLICY === "solver") {
      const ev = solveActions(s);
      action = ev ? ev.best : "stand";
    } else {
      action = advise(s) || "stand";
    }
    if (action === "surrender" && canSurrender(s)) s = surrender(s);
    else if (action === "split" && canSplit(s)) s = split(s);
    else if (action === "double" && canDouble(s)) s = doubleDown(s);
    else if (action === "stand") s = stand(s);
    else s = hit(s);
  }
  if (s.phase !== "settled") throw new Error(`stuck in phase ${s.phase} at hand ${i}`);
  staked += s.hands.reduce((acc, h) => acc + h.bet, 0);
  s = nextRound(s);
  if ((i + 1) % 5000 === 0) {
    const net = s.bankroll - 10_000_000;
    process.stdout.write(
      `  ${i + 1} hands · net ${net} · edge ${((net / staked) * 100).toFixed(3)}%\n`,
    );
  }
}

const net = s.bankroll - 10_000_000;
const secs = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\npolicy: ${POLICY} · ${s.stats.hands} settled hands in ${secs}s`);
console.log(
  `W/L/P: ${s.stats.wins}/${s.stats.losses}/${s.stats.pushes} · BJ ${s.stats.blackjacks} · surrenders ${s.stats.surrenders}`,
);
console.log(
  `net: ${net} · staked: ${staked} · realized edge: ${((net / staked) * 100).toFixed(3)}%`,
);
console.log(`stats.net consistency: ${s.stats.net === net ? "OK" : "MISMATCH"}`);
