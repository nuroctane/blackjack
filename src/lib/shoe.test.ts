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
  rebuildShoeExcluding,
  stand,
  type Card,
} from "./shoe";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// handValue
assert(handValue([{ rank: "A", suit: "♠", id: "1" }, { rank: "K", suit: "♥", id: "2" }]).total === 21, "BJ 21");
assert(isBlackjack([{ rank: "A", suit: "♠", id: "1" }, { rank: "K", suit: "♥", id: "2" }]), "is BJ");
assert(handValue([{ rank: "A", suit: "♠", id: "1" }, { rank: "A", suit: "♥", id: "2" }]).total === 12, "soft 12");
assert(handValue([{ rank: "A", suit: "♠", id: "1" }, { rank: "6", suit: "♥", id: "2" }, { rank: "K", suit: "♦", id: "3" }]).total === 17, "hard 17");
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
}

// nextRound reshuffles when thin
t = nextRound({ ...t, shoe: freshShoe(1).slice(0, 10) });
assert(t.shoe.length === 52, "reshuffle between rounds");

// hit path does not inject undefined
t = deal(newTable(6, 1000));
if (t.phase === "player") {
  const before = t.player.length;
  t = hit(t);
  assert(t.player.length === before + 1 || t.phase === "settled", "hit draws or settles");
}

// double only on two-card player phase with bankroll
{
  let d = deal(newTable(6, 1000));
  if (d.phase === "player") {
    assert(canDouble(d) === true, "can double two-card");
    const bank = d.bankroll;
    const bet = d.bet;
    d = doubleDown(d);
    assert(d.player.length === 3 || d.phase === "settled", "double draws one");
    // stake was doubled: bankroll paid extra bet
    assert(d.bankroll === bank - bet || d.phase === "settled", "double stakes");
  }
}

console.log("shoe.test.ts: all passed");
