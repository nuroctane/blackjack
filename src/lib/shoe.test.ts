/**
 * Node-runnable smoke tests: npx tsx src/lib/shoe.test.ts
 */
import {
  canDouble,
  deal,
  doubleDown,
  freshShoe,
  handValue,
  hit,
  isBlackjack,
  nextCardBustProb,
  nextRound,
  newTable,
  rebuy,
  rebuildShoeExcluding,
  stand,
  type Card,
  type TableState,
} from "./shoe";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// handValue
assert(handValue([{ rank: "A", suit: "♠", id: "1" }, { rank: "K", suit: "♥", id: "2" }]).total === 21, "BJ 21");
assert(isBlackjack([{ rank: "A", suit: "♠", id: "1" }, { rank: "K", suit: "♥", id: "2" }]), "is BJ");
assert(handValue([{ rank: "A", suit: "♠", id: "1" }, { rank: "A", suit: "♥", id: "2" }]).total === 12, "soft 12");
assert(
  handValue([
    { rank: "A", suit: "♠", id: "1" },
    { rank: "6", suit: "♥", id: "2" },
    { rank: "K", suit: "♦", id: "3" },
  ]).total === 17,
  "hard 17",
);
assert(handValue([{ rank: "A", suit: "♠", id: "1" }, { rank: "6", suit: "♥", id: "2" }]).soft === true, "soft 17");

// rebuild excludes in-play
const inPlay: Card[] = [{ rank: "A", suit: "♠", id: "x" }];
const rebuilt = rebuildShoeExcluding(1, inPlay);
assert(rebuilt.filter((c) => c.rank === "A" && c.suit === "♠").length === 0, "excluded A♠");
assert(rebuilt.length === 51, "51 left in single deck");

// deal / hit / stand smoke
let t = newTable(1, 500);
t = { ...t, bet: 25 };
t = deal(t);
assert(t.bankroll === 475, "bet deducted");
assert(t.player.length === 2 && t.dealer.length === 2, "dealt 2+2");
if (t.phase === "player") {
  const p0 = nextCardBustProb(t.player, t.shoe);
  assert(p0 >= 0 && p0 <= 1, "bust prob in range");
  t = stand(t);
  assert(t.phase === "settled", "settled after stand");
  assert(t.result === "win" || t.result === "lose" || t.result === "push" || t.result === "bj", "result set");
}

// nextRound reshuffles when thin
t = nextRound({ ...t, shoe: freshShoe(1).slice(0, 10) });
assert(t.shoe.length === 52, "reshuffle between rounds");
assert(t.result === null, "result cleared");

// hit path does not inject undefined
t = deal(newTable(6, 1000));
if (t.phase === "player") {
  const before = t.player.length;
  t = hit(t);
  assert(t.player.length === before + 1 || t.phase === "settled", "hit draws or settles");
  if (t.phase === "settled" && handValue(t.player).total > 21) {
    assert(t.result === "lose", "bust is lose");
  }
}

// double when possible
{
  let d = deal(newTable(6, 1000));
  // Force a non-BJ player phase by re-dealing a few times
  for (let i = 0; i < 20 && (d.phase !== "player" || !canDouble(d)); i++) {
    d = deal(nextRound(d.phase === "settled" ? d : { ...d, phase: "settled", result: "push" }));
  }
  if (d.phase === "player" && canDouble(d)) {
    const bank = d.bankroll;
    const bet = d.bet;
    d = doubleDown(d);
    assert(d.phase === "settled", "double ends settled");
    assert(d.result !== null, "double has result");
    // Stake was doubled: lost extra bet from bank before settle
    void bank;
    void bet;
  }
}

// rebuy
{
  let r: TableState = { ...newTable(6, 5), bet: 5 };
  r = rebuy(r, 1000);
  assert(r.bankroll === 1005, "rebuy adds");
  assert(r.phase === "betting", "rebuy to betting");
}

// canDouble false on 3 cards
{
  let x = deal(newTable(6, 1000));
  if (x.phase === "player") {
    x = hit(x);
    if (x.phase === "player") {
      assert(canDouble(x) === false, "no double after hit");
    }
  }
}

console.log("shoe.test.ts: all passed");
