/**
 * Multi-deck blackjack engine — full rule surface.
 *
 * v0.2: rule config (H17/S17, DAS, payout, surrender, insurance, penetration),
 * multi-hand split, insurance / even money, late surrender, exact dealer
 * outcome distribution + stand EV, Hi-Lo running/true count, session stats.
 *
 * Honest-math contract: every probability here is exact combinatorics over the
 * remaining shoe composition. Nothing is a static chart approximation except
 * the advisor in strategy.ts, which is labeled as chart-based.
 */

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export type Suit = "♠" | "♥" | "♦" | "♣";

export type Card = { rank: Rank; suit: Suit; id: string };

const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

export type DoublePolicy = "any2" | "9to11" | "10to11";

export type Rules = {
  decks: number;
  /** H17 = true (dealer hits soft 17), S17 = false */
  dealerHitsSoft17: boolean;
  /** 1.5 = 3:2, 1.2 = 6:5 */
  blackjackPayout: number;
  doubleAllowed: DoublePolicy;
  doubleAfterSplit: boolean;
  /** Max total hands after splits (4 = split to 4 hands) */
  maxHands: number;
  hitSplitAces: boolean;
  resplitAces: boolean;
  lateSurrender: boolean;
  insurance: boolean;
  /** Fraction of shoe dealt before reshuffle between rounds (cut card) */
  penetration: number;
};

export const DEFAULT_RULES: Rules = {
  decks: 6,
  dealerHitsSoft17: true,
  blackjackPayout: 1.5,
  doubleAllowed: "any2",
  doubleAfterSplit: true,
  maxHands: 4,
  hitSplitAces: false,
  resplitAces: false,
  lateSurrender: true,
  insurance: true,
  penetration: 0.75,
};

/** @deprecated read state.rules.dealerHitsSoft17 — kept for older imports */
export const DEALER_HITS_SOFT_17 = true;

/* ------------------------------------------------------------------ */
/* Shoe                                                                */
/* ------------------------------------------------------------------ */

export function freshShoe(decks = 1): Card[] {
  const cards: Card[] = [];
  let n = 0;
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, id: `${d}-${rank}${suit}-${n++}` });
      }
    }
  }
  return shuffle(cards);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rankSuitKey(c: Card): string {
  return `${c.rank}|${c.suit}`;
}

/** New shoe with in-play cards removed by rank/suit multiset (ids change on reshuffle). */
export function rebuildShoeExcluding(decks: number, exclude: Card[]): Card[] {
  const need = new Map<string, number>();
  for (const c of exclude) {
    const k = rankSuitKey(c);
    need.set(k, (need.get(k) || 0) + 1);
  }
  const shoe = freshShoe(decks);
  const out: Card[] = [];
  for (const c of shoe) {
    const k = rankSuitKey(c);
    const r = need.get(k) || 0;
    if (r > 0) {
      need.set(k, r - 1);
      continue;
    }
    out.push(c);
  }
  return shuffle(out);
}

/* ------------------------------------------------------------------ */
/* Hand math                                                           */
/* ------------------------------------------------------------------ */

export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J" || rank === "10") return 10;
  return Number(rank);
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces += 1;
      total += 11;
    } else {
      total += cardValue(c.rank);
    }
  }
  let acesAs11 = aces;
  while (total > 21 && acesAs11 > 0) {
    total -= 10;
    acesAs11 -= 1;
  }
  return { total, soft: acesAs11 > 0 && total <= 21 };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function nextCardBustProb(player: Card[], shoe: Card[]): number {
  const { total } = handValue(player);
  if (total > 21) return 1;
  if (total === 21) return 0;
  if (shoe.length === 0) return 0;
  let bust = 0;
  for (const c of shoe) {
    if (handValue([...player, c]).total > 21) bust += 1;
  }
  return bust / shoe.length;
}

export function dealerNaturalProb(upcard: Card, shoe: Card[]): number {
  if (upcard.rank !== "A" && !["10", "J", "Q", "K"].includes(upcard.rank)) return 0;
  if (shoe.length === 0) return 0;
  let hits = 0;
  for (const c of shoe) {
    if (handValue([upcard, c]).total === 21) hits += 1;
  }
  return hits / shoe.length;
}

/* ------------------------------------------------------------------ */
/* Exact dealer outcome distribution                                   */
/* ------------------------------------------------------------------ */

export type DealerDist = {
  p17: number;
  p18: number;
  p19: number;
  p20: number;
  p21: number;
  bust: number;
};

/** Remaining shoe as counts per value class: index 0 = Ace, 1..8 = 2..9, 9 = ten-value. */
function shoeValueCounts(shoe: Card[]): number[] {
  const counts = new Array(10).fill(0);
  for (const c of shoe) {
    if (c.rank === "A") counts[0] += 1;
    else if (cardValue(c.rank) === 10) counts[9] += 1;
    else counts[Number(c.rank) - 1] += 1;
  }
  return counts;
}

function classValue(i: number): number {
  return i === 0 ? 11 : i + 1; // ace as 11 initially
}

/**
 * Exact dealer outcome probabilities from the live shoe (with depletion).
 * When `conditionNoBlackjack` is true (upcard A or ten after peek/insurance
 * resolution), naturals are excluded from the hole card and the distribution
 * is renormalized — the standard post-peek conditional.
 */
export function dealerOutcomeDist(
  upcard: Card,
  shoe: Card[],
  rules: Rules,
  conditionNoBlackjack = true,
): DealerDist {
  const out: DealerDist = { p17: 0, p18: 0, p19: 0, p20: 0, p21: 0, bust: 0 };
  const counts = shoeValueCounts(shoe);
  const upVal = cardValue(upcard.rank);
  const upIsAce = upcard.rank === "A";
  const upIsTen = upVal === 10 && !upIsAce;

  const record = (total: number, soft: boolean, prob: number) => {
    void soft;
    if (total > 21) out.bust += prob;
    else if (total === 21) out.p21 += prob;
    else if (total === 20) out.p20 += prob;
    else if (total === 19) out.p19 += prob;
    else if (total === 18) out.p18 += prob;
    else out.p17 += prob;
  };

  const shouldHit = (total: number, soft: boolean) =>
    total < 17 || (rules.dealerHitsSoft17 && soft && total === 17);

  const recurse = (
    total: number,
    aces11: number,
    remaining: number,
    prob: number,
    isHoleDraw: boolean,
  ) => {
    let t = total;
    let a = aces11;
    while (t > 21 && a > 0) {
      t -= 10;
      a -= 1;
    }
    const soft = a > 0 && t <= 21;
    if (!shouldHit(t, soft) || t > 21) {
      record(t, soft, prob);
      return;
    }
    let denom = remaining;
    let blockedClass = -1;
    if (isHoleDraw && conditionNoBlackjack) {
      if (upIsAce) blockedClass = 9; // ten-value hole would be a natural
      if (upIsTen) blockedClass = 0; // ace hole would be a natural
      if (blockedClass >= 0) denom -= counts[blockedClass];
    }
    if (denom <= 0) {
      record(t, soft, prob); // pathological: stand where we are
      return;
    }
    for (let i = 0; i < 10; i++) {
      if (counts[i] === 0 || i === blockedClass) continue;
      const p = counts[i] / denom;
      counts[i] -= 1;
      recurse(t + classValue(i), a + (i === 0 ? 1 : 0), remaining - 1, prob * p, false);
      counts[i] += 1;
    }
  };

  recurse(upVal, upIsAce ? 1 : 0, shoe.length, 1, true);
  return out;
}

/** Exact EV (per unit staked) of standing on `playerTotal` vs the dealer distribution. */
export function standEV(playerTotal: number, dist: DealerDist): number {
  if (playerTotal > 21) return -1;
  const rows: Array<[number, number]> = [
    [17, dist.p17],
    [18, dist.p18],
    [19, dist.p19],
    [20, dist.p20],
    [21, dist.p21],
  ];
  let ev = dist.bust; // dealer bust = win
  for (const [d, p] of rows) {
    if (playerTotal > d) ev += p;
    else if (playerTotal < d) ev -= p;
  }
  return ev;
}

/* ------------------------------------------------------------------ */
/* Hi-Lo count                                                         */
/* ------------------------------------------------------------------ */

function hiLoValue(rank: Rank): number {
  const v = cardValue(rank);
  if (v >= 2 && v <= 6) return 1;
  if (v === 10 || rank === "A") return -1;
  return 0;
}

/**
 * Hi-Lo running count over every card no longer in the shoe, minus cards the
 * player cannot see (the hidden hole card).
 */
export function hiLoCount(state: TableState): { running: number; true: number } {
  const seen = new Map<Rank, number>();
  const bump = (r: Rank, n: number) => seen.set(r, (seen.get(r) || 0) + n);
  for (const r of RANKS) bump(r, state.rules.decks * 4);
  for (const c of state.shoe) bump(c.rank, -1);
  // cards out of the shoe = seen, except a hidden hole card
  const holeHidden =
    (state.phase === "player" || state.phase === "insurance") && state.dealer.length >= 2;
  let running = 0;
  for (const [rank, totalOfRank] of seen) {
    let visible = totalOfRank;
    if (holeHidden && state.dealer[1] && state.dealer[1].rank === rank) visible -= 1;
    running += hiLoValue(rank) * visible;
  }
  const decksLeft = Math.max(state.shoe.length / 52, 0.25);
  return { running, true: running / decksLeft };
}

/* ------------------------------------------------------------------ */
/* Table state                                                         */
/* ------------------------------------------------------------------ */

export type Phase = "betting" | "insurance" | "player" | "dealer" | "settled";

export type HandResult = "win" | "lose" | "push" | "bj" | "surrender" | null;

export type PlayerHand = {
  cards: Card[];
  bet: number;
  doubled: boolean;
  surrendered: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  result: HandResult;
};

export type SessionStats = {
  hands: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  surrenders: number;
  net: number;
};

export const EMPTY_STATS: SessionStats = {
  hands: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  surrenders: 0,
  net: 0,
};

export type TableState = {
  rules: Rules;
  shoe: Card[];
  hands: PlayerHand[];
  active: number;
  dealer: Card[];
  phase: Phase;
  message: string;
  /** Aggregate tone when phase === "settled" */
  result: HandResult;
  /** Base bet for the next deal */
  bet: number;
  bankroll: number;
  insuranceBet: number;
  stats: SessionStats;
};

/** Legacy single-hand accessor for older callers/UI. */
export function activeHand(state: TableState): PlayerHand | undefined {
  return state.hands[state.active];
}

function makeHand(cards: Card[], bet: number, fromSplit = false, splitAces = false): PlayerHand {
  return {
    cards,
    bet,
    doubled: false,
    surrendered: false,
    fromSplit,
    splitAces,
    done: false,
    result: null,
  };
}

export function newTable(rulesOrDecks: Rules | number = DEFAULT_RULES, bankroll = 1000): TableState {
  const rules: Rules =
    typeof rulesOrDecks === "number" ? { ...DEFAULT_RULES, decks: rulesOrDecks } : { ...rulesOrDecks };
  return {
    rules,
    shoe: freshShoe(rules.decks),
    hands: [],
    active: 0,
    dealer: [],
    phase: "betting",
    message: `Place a bet to deal. Dealer ${rules.dealerHitsSoft17 ? "H17" : "S17"}.`,
    result: null,
    bet: Math.min(25, bankroll) || 0,
    bankroll,
    insuranceBet: 0,
    stats: { ...EMPTY_STATS },
  };
}

/** Swap rule set between rounds. Fresh shoe; bankroll, bet, and stats carry over. */
export function applyRules(state: TableState, rules: Rules): TableState {
  if (state.phase !== "betting" && state.phase !== "settled") return state;
  return {
    ...state,
    rules: { ...rules },
    shoe: freshShoe(rules.decks),
    hands: [],
    active: 0,
    dealer: [],
    phase: "betting",
    message: `Rules updated — fresh ${rules.decks}-deck shoe. Dealer ${rules.dealerHitsSoft17 ? "H17" : "S17"}.`,
    result: null,
    insuranceBet: 0,
  };
}

function draw(state: TableState): { card: Card; state: TableState } {
  let shoe = state.shoe;
  if (shoe.length === 0) {
    const inPlay = [...state.hands.flatMap((h) => h.cards), ...state.dealer];
    shoe = rebuildShoeExcluding(state.rules.decks, inPlay);
  }
  if (shoe.length === 0) {
    throw new Error("Shoe exhausted");
  }
  const [card, ...rest] = shoe;
  return { card, state: { ...state, shoe: rest } };
}

/** Reshuffle between rounds once the cut card (penetration) has passed. */
function maybeReshuffle(state: TableState): Card[] {
  const full = state.rules.decks * 52;
  const dealt = full - state.shoe.length;
  // Cut card drives reshuffles; a small floor guards degenerate shoes.
  // Mid-hand exhaustion is handled by rebuildShoeExcluding in draw().
  const minForRound = 15;
  if (dealt / full >= state.rules.penetration || state.shoe.length < minForRound) {
    return freshShoe(state.rules.decks);
  }
  return state.shoe;
}

/* ------------------------------------------------------------------ */
/* Round flow                                                          */
/* ------------------------------------------------------------------ */

export function deal(state: TableState): TableState {
  if (state.phase !== "betting") return state;
  if (state.bet <= 0 || state.bet > state.bankroll) {
    return { ...state, message: "Invalid bet." };
  }
  const shoe = maybeReshuffle(state);
  let s: TableState = {
    ...state,
    shoe,
    hands: [makeHand([], state.bet)],
    active: 0,
    dealer: [],
    bankroll: state.bankroll - state.bet,
    message: "",
    result: null,
    insuranceBet: 0,
  };
  try {
    let c: Card;
    ({ card: c, state: s } = draw(s));
    s = withHandCards(s, 0, [c]);
    ({ card: c, state: s } = draw(s));
    s = { ...s, dealer: [c] };
    ({ card: c, state: s } = draw(s));
    s = withHandCards(s, 0, [...s.hands[0].cards, c]);
    ({ card: c, state: s } = draw(s));
    s = { ...s, dealer: [...s.dealer, c] };
  } catch {
    return {
      ...state,
      message: "Could not deal — shoe error. Try again.",
      phase: "betting",
      result: null,
    };
  }

  const upcard = s.dealer[0];
  const playerBJ = isBlackjack(s.hands[0].cards);

  // Insurance decision comes before the peek when the upcard is an ace.
  if (upcard.rank === "A" && s.rules.insurance && s.bankroll >= Math.ceil(s.bet / 2)) {
    return {
      ...s,
      phase: "insurance",
      message: playerBJ
        ? "Dealer shows ace. Even money?"
        : "Dealer shows ace. Insurance pays 2:1.",
    };
  }

  return resolvePeek(s);
}

/** Dealer peeks for blackjack on ten/ace upcards, then play begins. */
function resolvePeek(s: TableState): TableState {
  const upVal = cardValue(s.dealer[0].rank);
  const dealerBJ = isBlackjack(s.dealer);
  const playerBJ = isBlackjack(s.hands[0].cards);

  if ((upVal === 10 || s.dealer[0].rank === "A") && dealerBJ) {
    return settle({ ...s, phase: "settled" });
  }
  if (playerBJ) {
    return settle({ ...s, phase: "settled" });
  }
  return { ...s, phase: "player", message: "Hit or stand." };
}

export function canInsure(state: TableState): boolean {
  return state.phase === "insurance";
}

export function takeInsurance(state: TableState): TableState {
  if (state.phase !== "insurance") return state;
  const stake = Math.ceil(state.hands[0].bet / 2);
  if (state.bankroll < stake) return declineInsurance(state);
  const s: TableState = {
    ...state,
    bankroll: state.bankroll - stake,
    insuranceBet: stake,
  };
  return resolvePeek(s);
}

export function declineInsurance(state: TableState): TableState {
  if (state.phase !== "insurance") return state;
  return resolvePeek({ ...state, insuranceBet: 0 });
}

function withHandCards(state: TableState, i: number, cards: Card[]): TableState {
  const hands = state.hands.map((h, idx) => (idx === i ? { ...h, cards } : h));
  return { ...state, hands };
}

function withHand(state: TableState, i: number, patch: Partial<PlayerHand>): TableState {
  const hands = state.hands.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
  return { ...state, hands };
}

/** Give a fresh split hand its second card when it becomes active; auto-advance where forced. */
function activateCurrent(state: TableState): TableState {
  let s = state;
  const i = s.active;
  const h = s.hands[i];
  if (!h) return advance(s);
  if (h.cards.length === 1) {
    try {
      let c: Card;
      ({ card: c, state: s } = draw(s));
      s = withHandCards(s, i, [...s.hands[i].cards, c]);
    } catch {
      s = withHand(s, i, { done: true });
      return advance({ ...s, message: "Shoe exhausted mid-hand." });
    }
    const hand = s.hands[i];
    const v = handValue(hand.cards).total;
    if (hand.splitAces && !s.rules.hitSplitAces) {
      s = withHand(s, i, { done: true });
      return advance(s);
    }
    if (v === 21) {
      s = withHand(s, i, { done: true });
      return advance(s);
    }
  }
  const label = s.hands.length > 1 ? `Hand ${i + 1}: ` : "";
  return { ...s, message: `${label}${handValue(s.hands[i].cards).total}. Your move.` };
}

/** Move to the next unfinished hand, or the dealer, or settle. */
function advance(state: TableState): TableState {
  let s = state;
  for (let i = s.active; i < s.hands.length; i++) {
    if (!s.hands[i].done) {
      s = { ...s, active: i };
      return activateCurrent(s);
    }
  }
  const anyLive = s.hands.some(
    (h) => !h.surrendered && handValue(h.cards).total <= 21,
  );
  if (!anyLive) {
    return settle({ ...s, phase: "settled" });
  }
  return playDealer({ ...s, phase: "dealer", message: "Dealer plays…" });
}

function dealerShouldHitCards(cards: Card[], rules: Rules): boolean {
  const { total, soft } = handValue(cards);
  if (total < 17) return true;
  if (rules.dealerHitsSoft17 && soft && total === 17) return true;
  return false;
}

function playDealer(state: TableState): TableState {
  let s = state;
  try {
    while (dealerShouldHitCards(s.dealer, s.rules)) {
      let c: Card;
      ({ card: c, state: s } = draw(s));
      s = { ...s, dealer: [...s.dealer, c] };
    }
  } catch {
    return settle({ ...s, phase: "settled", message: "Shoe exhausted — settling." });
  }
  return settle({ ...s, phase: "settled" });
}

/* ------------------------------------------------------------------ */
/* Player actions                                                      */
/* ------------------------------------------------------------------ */

export function hit(state: TableState): TableState {
  if (state.phase !== "player") return state;
  const i = state.active;
  const h = state.hands[i];
  if (!h || h.done) return state;
  if (h.splitAces && !state.rules.hitSplitAces) return state;
  let s = state;
  try {
    let c: Card;
    ({ card: c, state: s } = draw(s));
    s = withHandCards(s, i, [...s.hands[i].cards, c]);
  } catch {
    return { ...state, message: "Shoe exhausted mid-hand." };
  }
  const v = handValue(s.hands[i].cards).total;
  if (v >= 21) {
    s = withHand(s, i, { done: true });
    return advance(s);
  }
  const label = s.hands.length > 1 ? `Hand ${i + 1}: ` : "";
  return { ...s, message: `${label}${v}. Your move.` };
}

export function stand(state: TableState): TableState {
  if (state.phase !== "player") return state;
  const i = state.active;
  const s = withHand(state, i, { done: true });
  return advance(s);
}

export function canDouble(state: TableState): boolean {
  if (state.phase !== "player") return false;
  const h = state.hands[state.active];
  if (!h || h.cards.length !== 2 || h.doubled) return false;
  if (h.splitAces) return false;
  if (h.fromSplit && !state.rules.doubleAfterSplit) return false;
  if (state.bankroll < h.bet) return false;
  const { total, soft } = handValue(h.cards);
  if (state.rules.doubleAllowed === "9to11") return !soft && total >= 9 && total <= 11;
  if (state.rules.doubleAllowed === "10to11") return !soft && total >= 10 && total <= 11;
  return true;
}

export function doubleDown(state: TableState): TableState {
  if (!canDouble(state)) {
    return { ...state, message: state.message || "Cannot double." };
  }
  const i = state.active;
  const h = state.hands[i];
  let s: TableState = {
    ...state,
    bankroll: state.bankroll - h.bet,
  };
  s = withHand(s, i, { bet: h.bet * 2, doubled: true });
  try {
    let c: Card;
    ({ card: c, state: s } = draw(s));
    s = withHandCards(s, i, [...s.hands[i].cards, c]);
  } catch {
    return { ...state, message: "Shoe exhausted on double." };
  }
  s = withHand(s, i, { done: true });
  return advance(s);
}

export function canSplit(state: TableState): boolean {
  if (state.phase !== "player") return false;
  const h = state.hands[state.active];
  if (!h || h.cards.length !== 2) return false;
  if (cardValue(h.cards[0].rank) !== cardValue(h.cards[1].rank)) return false;
  if (state.hands.length >= state.rules.maxHands) return false;
  if (state.bankroll < h.bet) return false;
  if (h.cards[0].rank === "A" && h.fromSplit && !state.rules.resplitAces) return false;
  return true;
}

export function split(state: TableState): TableState {
  if (!canSplit(state)) {
    return { ...state, message: state.message || "Cannot split." };
  }
  const i = state.active;
  const h = state.hands[i];
  const aces = h.cards[0].rank === "A";
  const first = makeHand([h.cards[0]], h.bet, true, aces);
  const second = makeHand([h.cards[1]], h.bet, true, aces);
  const hands = [...state.hands];
  hands.splice(i, 1, first, second);
  const s: TableState = {
    ...state,
    hands,
    bankroll: state.bankroll - h.bet,
    message: aces ? "Split aces — one card each." : "Split.",
  };
  return activateCurrent(s);
}

export function canSurrender(state: TableState): boolean {
  if (!state.rules.lateSurrender) return false;
  if (state.phase !== "player") return false;
  if (state.hands.length !== 1) return false;
  const h = state.hands[0];
  return h.cards.length === 2 && !h.doubled && !h.fromSplit;
}

export function surrender(state: TableState): TableState {
  if (!canSurrender(state)) {
    return { ...state, message: state.message || "Cannot surrender." };
  }
  const s = withHand(state, 0, { surrendered: true, done: true });
  return settle({ ...s, phase: "settled" });
}

/* ------------------------------------------------------------------ */
/* Settle                                                              */
/* ------------------------------------------------------------------ */

function settle(state: TableState): TableState {
  const d = handValue(state.dealer).total;
  const dBJ = isBlackjack(state.dealer);
  let bankroll = state.bankroll;
  let net = 0;
  const stats = { ...state.stats };
  const parts: string[] = [];
  const hands = state.hands.map((hand, idx) => {
    const label = state.hands.length > 1 ? `Hand ${idx + 1}` : "You";
    const p = handValue(hand.cards).total;
    const pBJ = !hand.fromSplit && isBlackjack(hand.cards) && state.hands.length === 1;
    let result: HandResult = "lose";
    let credit = 0;

    if (hand.surrendered) {
      credit = hand.bet / 2;
      result = "surrender";
      parts.push(`${label}: surrender (−${hand.bet / 2}).`);
    } else if (p > 21) {
      result = "lose";
      parts.push(`${label}: bust ${p}.`);
    } else if (dBJ && pBJ) {
      credit = hand.bet;
      result = "push";
      parts.push(`${label}: push — both blackjack.`);
    } else if (dBJ) {
      result = "lose";
      parts.push(`${label}: dealer blackjack.`);
    } else if (pBJ) {
      credit = hand.bet * (1 + state.rules.blackjackPayout);
      result = "bj";
      const payoutLabel = state.rules.blackjackPayout === 1.5 ? "3:2" : "6:5";
      parts.push(`${label}: blackjack! +${credit - hand.bet} (${payoutLabel}).`);
    } else if (d > 21) {
      credit = hand.bet * 2;
      result = "win";
      parts.push(`${label}: dealer busts ${d} — win ${hand.bet}.`);
    } else if (p > d) {
      credit = hand.bet * 2;
      result = "win";
      parts.push(`${label}: ${p} vs ${d} — win ${hand.bet}.`);
    } else if (p < d) {
      result = "lose";
      parts.push(`${label}: ${p} vs ${d}.`);
    } else {
      credit = hand.bet;
      result = "push";
      parts.push(`${label}: push ${p}.`);
    }

    bankroll += credit;
    net += credit - hand.bet;

    stats.hands += 1;
    if (result === "win") stats.wins += 1;
    else if (result === "lose") stats.losses += 1;
    else if (result === "push") stats.pushes += 1;
    else if (result === "bj") {
      stats.wins += 1;
      stats.blackjacks += 1;
    } else if (result === "surrender") stats.surrenders += 1;

    return { ...hand, done: true, result };
  });

  // Insurance settles against the dealer natural.
  if (state.insuranceBet > 0) {
    if (dBJ) {
      const credit = state.insuranceBet * 3;
      bankroll += credit;
      net += credit - state.insuranceBet;
      parts.push(`Insurance pays ${state.insuranceBet * 2}.`);
    } else {
      net -= state.insuranceBet;
      parts.push(`Insurance loses ${state.insuranceBet}.`);
    }
  }

  stats.net += net;

  let tone: HandResult = "push";
  if (hands.some((h) => h.result === "bj") && net > 0) tone = "bj";
  else if (net > 0) tone = "win";
  else if (net < 0) tone = "lose";

  return {
    ...state,
    hands,
    bankroll,
    stats,
    message: parts.join(" "),
    result: tone,
    phase: "settled",
  };
}

/* ------------------------------------------------------------------ */
/* Round transitions                                                   */
/* ------------------------------------------------------------------ */

export function nextRound(state: TableState): TableState {
  const shoe = maybeReshuffle(state);
  const bet = Math.min(state.bet, state.bankroll);
  const safeBet =
    bet > 0
      ? bet
      : state.bankroll >= 10
        ? Math.min(25, state.bankroll)
        : state.bankroll;
  return {
    ...state,
    shoe,
    hands: [],
    active: 0,
    dealer: [],
    phase: "betting",
    message:
      state.bankroll <= 0
        ? "Bankroll empty — rebuy to continue."
        : `Place a bet to deal. Dealer ${state.rules.dealerHitsSoft17 ? "H17" : "S17"}.`,
    result: null,
    bet: safeBet,
    insuranceBet: 0,
  };
}

/** Top up bankroll for demo play (not on-chain). */
export function rebuy(state: TableState, amount = 1000): TableState {
  if (state.phase !== "betting" && state.phase !== "settled") return state;
  const bankroll = state.bankroll + amount;
  return {
    ...state,
    bankroll,
    hands: [],
    active: 0,
    dealer: [],
    phase: "betting",
    bet: Math.min(Math.max(state.bet, 10), bankroll) || Math.min(25, bankroll),
    message: `Rebuy +${amount}. Bankroll ${bankroll}.`,
    result: null,
    insuranceBet: 0,
  };
}
