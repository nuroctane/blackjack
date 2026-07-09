/**
 * Node-runnable smoke tests: npx tsx src/lib/shoe.test.ts
 */
import {
  applyRules,
  canDouble,
  canSplit,
  canSurrender,
  deal,
  dealerOutcomeDist,
  declineInsurance,
  DEFAULT_RULES,
  doubleDown,
  freshShoe,
  handValue,
  hiLoCount,
  hit,
  isBlackjack,
  newTable,
  nextCardBustProb,
  nextRound,
  rebuildShoeExcluding,
  rebuy,
  split,
  stand,
  standEV,
  surrender,
  takeInsurance,
  type Card,
  type Rules,
  type TableState,
} from "./shoe";
import { advise } from "./strategy";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const C = (rank: Card["rank"], suit: Card["suit"] = "♠", id = `${rank}${suit}${Math.random()}`): Card => ({
  rank,
  suit,
  id,
});

// handValue
assert(handValue([C("A"), C("K", "♥")]).total === 21, "BJ 21");
assert(isBlackjack([C("A"), C("K", "♥")]), "is BJ");
assert(handValue([C("A"), C("A", "♥")]).total === 12, "soft 12");
assert(handValue([C("A"), C("6", "♥"), C("K", "♦")]).total === 17, "hard 17");
assert(handValue([C("A"), C("6", "♥")]).soft === true, "soft 17");

// rebuild excludes in-play
const rebuilt = rebuildShoeExcluding(1, [C("A", "♠", "x")]);
assert(rebuilt.filter((c) => c.rank === "A" && c.suit === "♠").length === 0, "excluded A♠");
assert(rebuilt.length === 51, "51 left in single deck");

// deal / hit / stand smoke
let t = newTable({ ...DEFAULT_RULES, decks: 1, insurance: false }, 500);
t = { ...t, bet: 25 };
t = deal(t);
assert(t.bankroll === 475, "bet deducted");
assert(t.hands[0].cards.length === 2 && t.dealer.length === 2, "dealt 2+2");
if (t.phase === "player") {
  const p0 = nextCardBustProb(t.hands[0].cards, t.shoe);
  assert(p0 >= 0 && p0 <= 1, "bust prob in range");
  t = stand(t);
  assert(t.phase === "settled", "settled after stand");
  assert(t.result !== null, "result set");
}

// nextRound reshuffles past penetration
{
  const thin = { ...newTable(DEFAULT_RULES, 1000), shoe: freshShoe(6).slice(0, 30) };
  const n = nextRound(thin);
  assert(n.shoe.length === 312, "reshuffle past cut card");
  assert(n.result === null, "result cleared");
}

// single-deck penetration: shoe survives between rounds until cut card
{
  const oneDeck = { ...DEFAULT_RULES, decks: 1, penetration: 0.75 };
  const s = { ...newTable(oneDeck, 1000), shoe: freshShoe(1).slice(0, 40) }; // 12 dealt = 23%
  const n = nextRound(s);
  assert(n.shoe.length === 40, "no premature single-deck reshuffle");
}

// hit path does not inject undefined
t = deal(newTable(DEFAULT_RULES, 1000));
if (t.phase === "player") {
  const before = t.hands[0].cards.length;
  t = hit(t);
  assert(
    t.hands[0].cards.length === before + 1 || t.phase !== "player",
    "hit draws or ends turn",
  );
}

// double when possible
{
  let d = deal(newTable({ ...DEFAULT_RULES, insurance: false }, 1000));
  for (let i = 0; i < 40 && (d.phase !== "player" || !canDouble(d)); i++) {
    d = deal(nextRound(d.phase === "settled" ? d : { ...d, phase: "settled" }));
  }
  if (d.phase === "player" && canDouble(d)) {
    d = doubleDown(d);
    assert(d.phase === "settled", "double ends settled");
    assert(d.hands[0].doubled, "hand marked doubled");
    assert(d.hands[0].bet === d.bet * 2, "stake doubled");
  }
}

// forced split scenario
{
  const rules: Rules = { ...DEFAULT_RULES, insurance: false };
  let s: TableState = newTable(rules, 1000);
  s = { ...s, bet: 25 };
  s = deal(s);
  // Force a pair of 8s vs dealer 7 for deterministic split coverage
  s = {
    ...s,
    phase: "player",
    hands: [
      {
        cards: [C("8", "♠"), C("8", "♥")],
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
    dealer: [C("7", "♦"), C("9", "♣")],
  };
  assert(canSplit(s), "pair splittable");
  assert(advise(s) === "split", "chart says split 8s");
  const bankBefore = s.bankroll;
  s = split(s);
  assert(s.hands.length === 2, "two hands after split");
  assert(s.bankroll === bankBefore - 25, "second stake deducted");
  assert(s.hands[0].cards.length === 2, "active split hand drew");
  // play both hands out
  let guard = 0;
  while (s.phase === "player" && guard++ < 30) s = stand(s);
  assert(s.phase === "settled", "split round settles");
  assert(s.hands.every((h) => h.result !== null), "each split hand has a result");
}

// split aces: one card each
{
  let s: TableState = newTable({ ...DEFAULT_RULES, insurance: false }, 1000);
  s = deal({ ...s, bet: 25 });
  s = {
    ...s,
    phase: "player",
    hands: [
      {
        cards: [C("A", "♠"), C("A", "♥")],
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
    dealer: [C("6", "♦"), C("9", "♣")],
  };
  s = split(s);
  assert(s.phase === "settled" || s.phase === "dealer" || s.phase === "player", "flow continues");
  if (s.phase === "settled") {
    assert(
      s.hands.every((h) => h.cards.length === 2),
      "split aces got exactly one card each",
    );
  }
}

// surrender: half bet back
{
  let s: TableState = newTable({ ...DEFAULT_RULES, insurance: false }, 1000);
  s = deal({ ...s, bet: 100 });
  s = {
    ...s,
    phase: "player",
    hands: [
      {
        cards: [C("10", "♠"), C("6", "♥")],
        bet: 100,
        doubled: false,
        surrendered: false,
        fromSplit: false,
        splitAces: false,
        done: false,
        result: null,
      },
    ],
    active: 0,
    dealer: [C("10", "♦"), C("9", "♣")],
    bankroll: 900,
  };
  assert(canSurrender(s), "surrender available");
  assert(advise(s) === "surrender", "chart says surrender 16 vs 10");
  s = surrender(s);
  assert(s.phase === "settled", "surrender settles");
  assert(s.bankroll === 950, "half bet returned");
  assert(s.hands[0].result === "surrender", "result surrender");
}

// insurance flow: dealer shows ace → insurance phase; decline resolves
{
  let s: TableState = newTable(DEFAULT_RULES, 1000);
  for (let i = 0; i < 200 && s.phase !== "insurance"; i++) {
    s = deal(nextRound(s.phase === "settled" ? s : { ...s, phase: "settled" }));
  }
  if (s.phase === "insurance") {
    const bank = s.bankroll;
    const taken = takeInsurance(s);
    assert(taken.phase !== "insurance", "insurance resolves");
    assert(
      taken.bankroll <= bank || taken.phase === "settled",
      "insurance stake deducted (or settled with payout)",
    );
    const declined = declineInsurance(s);
    assert(declined.phase !== "insurance", "decline resolves");
    assert(declined.insuranceBet === 0, "no insurance stake on decline");
  }
}

// exact dealer distribution sums to 1
{
  const shoe = freshShoe(6);
  const dist = dealerOutcomeDist(C("6", "♦"), shoe, DEFAULT_RULES);
  const sum = dist.p17 + dist.p18 + dist.p19 + dist.p20 + dist.p21 + dist.bust;
  assert(Math.abs(sum - 1) < 1e-9, `dealer dist sums to 1 (got ${sum})`);
  assert(dist.bust > 0.3 && dist.bust < 0.6, "6-up bust rate plausible");
  const ev20 = standEV(20, dist);
  const ev12 = standEV(12, dist);
  assert(ev20 > ev12, "standing 20 beats standing 12 vs 6");
}

// post-peek conditional: ten upcard excludes naturals
{
  const shoe = freshShoe(6);
  const dist = dealerOutcomeDist(C("K", "♦"), shoe, DEFAULT_RULES, true);
  const sum = dist.p17 + dist.p18 + dist.p19 + dist.p20 + dist.p21 + dist.bust;
  assert(Math.abs(sum - 1) < 1e-9, "conditional dist sums to 1");
}

// Hi-Lo: fresh table counts zero
{
  const s = newTable(DEFAULT_RULES, 1000);
  const c = hiLoCount(s);
  assert(c.running === 0, "fresh shoe running count 0");
}

// rules swap
{
  let s = newTable(DEFAULT_RULES, 1000);
  s = applyRules(s, { ...DEFAULT_RULES, decks: 8, dealerHitsSoft17: false });
  assert(s.shoe.length === 416, "8-deck shoe");
  assert(s.rules.dealerHitsSoft17 === false, "S17 applied");
}

// 6:5 payout
{
  let s: TableState = newTable({ ...DEFAULT_RULES, blackjackPayout: 1.2, insurance: false }, 1000);
  s = deal({ ...s, bet: 100 });
  s = {
    ...s,
    phase: "player",
    hands: [
      {
        cards: [C("A", "♠"), C("K", "♥")],
        bet: 100,
        doubled: false,
        surrendered: false,
        fromSplit: false,
        splitAces: false,
        done: false,
        result: null,
      },
    ],
    active: 0,
    dealer: [C("9", "♦"), C("9", "♣")],
    bankroll: 900,
  };
  s = stand(s);
  assert(s.phase === "settled", "settled");
  assert(s.bankroll === 900 + 220, `6:5 pays 220 total (got +${s.bankroll - 900})`);
}

// rebuy
{
  let r: TableState = { ...newTable(DEFAULT_RULES, 5), bet: 5 };
  r = rebuy(r, 1000);
  assert(r.bankroll === 1005, "rebuy adds");
  assert(r.phase === "betting", "rebuy to betting");
}

// canDouble false on 3 cards
{
  let x = deal(newTable({ ...DEFAULT_RULES, insurance: false }, 1000));
  if (x.phase === "player") {
    x = hit(x);
    if (x.phase === "player" && x.hands[0].cards.length === 3) {
      assert(canDouble(x) === false, "no double after hit");
    }
  }
}

// stats accumulate
{
  let s = newTable({ ...DEFAULT_RULES, insurance: false }, 1000);
  for (let i = 0; i < 5; i++) {
    s = deal(s);
    let guard = 0;
    while (s.phase === "player" && guard++ < 20) s = stand(s);
    if (s.phase !== "settled") s = { ...s, phase: "settled" };
    s = nextRound(s);
  }
  assert(s.stats.hands >= 5, `stats tracked (${s.stats.hands} hands)`);
  assert(
    s.stats.wins + s.stats.losses + s.stats.pushes + s.stats.surrenders >= 5,
    "results tallied",
  );
}

console.log("shoe.test.ts: all passed");
