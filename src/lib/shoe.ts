/** Multi-deck shoe with combinatorial odds. Fixes mid-hand reshuffle corruption. */

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

/** Dealer hits soft 17 (H17) — common online rule; document in UI. */
export const DEALER_HITS_SOFT_17 = true;

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

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces += 1;
      total += 11;
    } else if (c.rank === "K" || c.rank === "Q" || c.rank === "J" || c.rank === "10") {
      total += 10;
    } else {
      total += Number(c.rank);
    }
  }
  // acesCountedAs11 tracks how many aces remain as 11
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

function dealerShouldHit(cards: Card[]): boolean {
  const { total, soft } = handValue(cards);
  if (total < 17) return true;
  if (DEALER_HITS_SOFT_17 && soft && total === 17) return true;
  return false;
}

export type Phase = "betting" | "player" | "dealer" | "settled";

export type TableState = {
  shoe: Card[];
  player: Card[];
  dealer: Card[];
  phase: Phase;
  message: string;
  bet: number;
  bankroll: number;
  decks: number;
};

export function newTable(decks = 6, bankroll = 1000): TableState {
  return {
    shoe: freshShoe(decks),
    player: [],
    dealer: [],
    phase: "betting",
    message: "Place a bet to deal. Dealer H17.",
    bet: 25,
    bankroll,
    decks,
  };
}

function draw(state: TableState): { card: Card; state: TableState } {
  let shoe = state.shoe;
  if (shoe.length === 0) {
    // Never invent cards already on the table
    shoe = rebuildShoeExcluding(state.decks, [...state.player, ...state.dealer]);
  }
  if (shoe.length === 0) {
    // Pathological: more cards in play than deck supports
    throw new Error("Shoe exhausted");
  }
  const [card, ...rest] = shoe;
  return { card, state: { ...state, shoe: rest } };
}

export function deal(state: TableState): TableState {
  if (state.phase !== "betting") return state;
  if (state.bet <= 0 || state.bet > state.bankroll) {
    return { ...state, message: "Invalid bet." };
  }
  // Reshuffle only between hands when penetration is deep
  let shoe = state.shoe;
  if (shoe.length < 52) {
    shoe = freshShoe(state.decks);
  }
  let s: TableState = {
    ...state,
    shoe,
    player: [],
    dealer: [],
    bankroll: state.bankroll - state.bet,
    message: "",
  };
  try {
    let c;
    ({ card: c, state: s } = draw(s));
    s = { ...s, player: [...s.player, c] };
    ({ card: c, state: s } = draw(s));
    s = { ...s, dealer: [...s.dealer, c] };
    ({ card: c, state: s } = draw(s));
    s = { ...s, player: [...s.player, c] };
    ({ card: c, state: s } = draw(s));
    s = { ...s, dealer: [...s.dealer, c] };
  } catch {
    return {
      ...state,
      message: "Could not deal — shoe error. Try again.",
      phase: "betting",
    };
  }

  if (isBlackjack(s.player) || isBlackjack(s.dealer)) {
    return settle({ ...s, phase: "settled" });
  }
  return { ...s, phase: "player", message: "Hit or stand." };
}

export function hit(state: TableState): TableState {
  if (state.phase !== "player") return state;
  let s = state;
  try {
    let c;
    ({ card: c, state: s } = draw(s));
    s = { ...s, player: [...s.player, c] };
  } catch {
    return { ...state, message: "Shoe exhausted mid-hand." };
  }
  const v = handValue(s.player).total;
  if (v > 21) {
    return {
      ...s,
      phase: "settled",
      message: `Bust ${v}. Dealer wins.`,
    };
  }
  if (v === 21) return stand(s);
  return { ...s, message: `You have ${v}. Hit or stand.` };
}

export function stand(state: TableState): TableState {
  if (state.phase !== "player") return state;
  let s: TableState = { ...state, phase: "dealer", message: "Dealer plays…" };
  try {
    while (dealerShouldHit(s.dealer)) {
      let c;
      ({ card: c, state: s } = draw(s));
      s = { ...s, dealer: [...s.dealer, c] };
    }
  } catch {
    return settle({ ...s, phase: "settled", message: "Shoe exhausted — settling." });
  }
  return settle({ ...s, phase: "settled" });
}

function settle(state: TableState): TableState {
  const p = handValue(state.player).total;
  const d = handValue(state.dealer).total;
  const pBJ = isBlackjack(state.player);
  const dBJ = isBlackjack(state.dealer);
  let bankroll = state.bankroll;
  let message = "";

  if (p > 21) {
    message = `Bust ${p}. You lose ${state.bet}.`;
  } else if (dBJ && pBJ) {
    bankroll += state.bet;
    message = "Push — both blackjack.";
  } else if (pBJ) {
    // 3:2: return stake + 1.5x win = 2.5x stake total credit
    const credit = Math.floor(state.bet * 2.5);
    bankroll += credit;
    message = `Blackjack! +${credit - state.bet} (3:2).`;
  } else if (dBJ) {
    message = `Dealer blackjack. Lose ${state.bet}.`;
  } else if (d > 21) {
    bankroll += state.bet * 2;
    message = `Dealer busts ${d}. You win ${state.bet}.`;
  } else if (p > d) {
    bankroll += state.bet * 2;
    message = `You ${p} vs ${d}. Win ${state.bet}.`;
  } else if (p < d) {
    message = `You ${p} vs ${d}. Lose ${state.bet}.`;
  } else {
    bankroll += state.bet;
    message = `Push ${p}.`;
  }

  return { ...state, bankroll, message, phase: "settled" };
}

export function nextRound(state: TableState): TableState {
  let shoe = state.shoe;
  if (shoe.length < 52) {
    shoe = freshShoe(state.decks);
  }
  return {
    ...state,
    shoe,
    player: [],
    dealer: [],
    phase: "betting",
    message: "Place a bet to deal. Dealer H17.",
  };
}
