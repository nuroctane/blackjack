/** Single-deck shoe with accurate combinatorial odds (no card counting UI yet). */

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

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J", "10"].includes(c.rank)) {
      total += 10;
    } else {
      total += Number(c.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const soft = cards.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  // soft if an ace is counted as 11
  let check = 0;
  let aceAs11 = false;
  for (const c of cards) {
    if (c.rank === "A") {
      if (!aceAs11 && check + 11 <= 21) {
        check += 11;
        aceAs11 = true;
      } else check += 1;
    } else if (["K", "Q", "J", "10"].includes(c.rank)) check += 10;
    else check += Number(c.rank);
  }
  return { total, soft: aceAs11 && total <= 21 };
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

/** Remaining composition after known cards removed from a full multi-deck shoe. */
export function remainingComposition(shoe: Card[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const c of shoe) {
    const k = c.rank === "10" || c.rank === "J" || c.rank === "Q" || c.rank === "K" ? "T" : c.rank;
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

/**
 * Player hit bust probability on next card (exact from remaining shoe).
 * Used for the odds panel — transparent combinatorial edge, not EV of full strategy.
 */
export function nextCardBustProb(player: Card[], shoe: Card[]): number {
  const { total } = handValue(player);
  if (total >= 21) return total > 21 ? 1 : 0;
  if (shoe.length === 0) return 0;
  let bust = 0;
  for (const c of shoe) {
    const t = handValue([...player, c]).total;
    if (t > 21) bust += 1;
  }
  return bust / shoe.length;
}

/** Probability dealer has a natural given upcard (approx using remaining shoe). */
export function dealerNaturalProb(upcard: Card, shoe: Card[]): number {
  if (upcard.rank !== "A" && !["10", "J", "Q", "K"].includes(upcard.rank)) return 0;
  if (shoe.length === 0) return 0;
  let hits = 0;
  for (const c of shoe) {
    const two = handValue([upcard, c]).total;
    if (two === 21) hits += 1;
  }
  return hits / shoe.length;
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
    message: "Place a bet to deal.",
    bet: 25,
    bankroll,
    decks,
  };
}

function draw(state: TableState): { card: Card; state: TableState } {
  let shoe = state.shoe;
  if (shoe.length < 20) shoe = freshShoe(state.decks);
  const [card, ...rest] = shoe;
  return { card, state: { ...state, shoe: rest } };
}

export function deal(state: TableState): TableState {
  if (state.phase !== "betting") return state;
  if (state.bet <= 0 || state.bet > state.bankroll) {
    return { ...state, message: "Invalid bet." };
  }
  let s: TableState = {
    ...state,
    player: [],
    dealer: [],
    bankroll: state.bankroll - state.bet,
    message: "",
  };
  let c;
  ({ card: c, state: s } = draw(s));
  s = { ...s, player: [...s.player, c] };
  ({ card: c, state: s } = draw(s));
  s = { ...s, dealer: [...s.dealer, c] };
  ({ card: c, state: s } = draw(s));
  s = { ...s, player: [...s.player, c] };
  ({ card: c, state: s } = draw(s));
  s = { ...s, dealer: [...s.dealer, c] };

  if (isBlackjack(s.player) || isBlackjack(s.dealer)) {
    return settle({ ...s, phase: "settled" });
  }
  return { ...s, phase: "player", message: "Hit or stand." };
}

export function hit(state: TableState): TableState {
  if (state.phase !== "player") return state;
  let s = state;
  let c;
  ({ card: c, state: s } = draw(s));
  s = { ...s, player: [...s.player, c] };
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
  while (handValue(s.dealer).total < 17) {
    let c;
    ({ card: c, state: s } = draw(s));
    s = { ...s, dealer: [...s.dealer, c] };
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
    const win = Math.floor(state.bet * 2.5);
    bankroll += win;
    message = `Blackjack! +${win - state.bet} (3:2).`;
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
  return {
    ...state,
    player: [],
    dealer: [],
    phase: "betting",
    message: "Place a bet to deal.",
  };
}
