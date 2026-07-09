# Blackjack — Digital Sea

Simple, clean **web3 blackjack**. Quiet table. Dense engine.

This is a single-purpose product: play and understand blackjack with maximum legibility and utility — nothing else. The surface stays minimal. Under the hood it is built to be thorough: real shoe composition, exact next-hit math, full rule surface, wallet-native identity, and a native mobile shell when you want it offline the browser.

**Brand:** Digital Sea — the same identity family as AstroSleep. Dark field, liquid glass materials, biolume accents, system type. Not casino neon. Not a multi-game lobby. Not a casino brand mashup. Just Digital Sea, applied to blackjack.

---

## The point

| Surface | Under the hood |
|--------|----------------|
| One felt, one hand at a time | Multi-deck shoe with true remaining composition |
| Hit / stand / bet / bankroll | Exact soft/hard totals, naturals, settle phases |
| Odds you can read in one glance | Combinatorial P(bust on next hit) from cards left |
| Connect wallet · optional GitHub | SIWE path (RainbowKit + WalletConnect), session work ahead |
| Quiet motion, glass, mono stats | Tokenized design system, Capacitor iOS/Android shell |

**Maximum utility for blackjack only.** No roulette, no poker, no social feed, no gamified spam. If a feature does not improve how you play, read, or settle a blackjack hand (or how you own your session on-chain), it does not belong here.

---

## Design principles

1. **Simple UI, comprehensive engine** — Fewer controls; deeper correctness. Players should never fight the chrome.
2. **Legibility first** — Totals, soft flags, bankroll, bet, shoe depth, and bust % are always scannable. Mono for numbers. Clear hierarchy, not decoration.
3. **Honest math** — Bust % is exact from remaining cards, not vibes. Do not claim full basic-strategy EV until that table actually ships.
4. **Quiet craft** — Apple-style materials and Emil-style motion restraint: press feedback, short durations, no slot-machine chaos.
5. **Web3 without cosplay** — Wallet connect is identity and future cash rails. The game is still blackjack; the chain is not the gimmick.
6. **Scope lock** — Features must be *about blackjack* (rules, shoe, odds, bankroll, settle, identity tied to play). Reject everything else.

---

## What you get today (v0.1+)

### Table

- Multi-deck shoe (default 6), shuffle, deal, hit, stand, settle, next hand  
- Bankroll + chip bet selection  
- Dealer hole card hide during player turn  
- Soft totals called out in the UI  
- Natural blackjack detection in the engine  

### Odds (odds-first)

- **P(bust on hit)** — exact fraction of remaining ranks that bust you next card  
- Driven by live shoe composition, not a static chart  
- Labeled honestly as combinatorial next-hit risk, not full strategy EV  

### Identity (web3)

- RainbowKit connect (Digital Sea–tinted dark theme)  
- WalletConnect project id via env  
- GitHub entry reserved (NextAuth wiring next)  
- SIWE session cookie + server verify planned  

### Shell & craft

- Next.js 15 + React 19 + TypeScript  
- Digital Sea tokens in `src/styles/sea.css` (void / glass / biolume / accent)  
- Capacitor config for iOS / Android native wrap  
- Agent skills for Apple design + Emil motion polish (`.agents/skills/`)  

---

## Roadmap (blackjack-only)

Everything below stays inside the game. No product sprawl.

| Priority | Feature | Why it belongs |
|----------|---------|----------------|
| Next | Double / split / insurance | Complete standard table actions |
| Next | Full SIWE session (cookie + server verify) | Real web3 session, not connect-only |
| Next | On-chain buy-in / cashout | Bankroll that can leave the browser |
| Soon | Basic-strategy EV / advice table | Full EV from remaining shoe + rules — only when exact |
| Soon | Surrender / dealer rules toggles (H17/S17, DAS, etc.) | Rule-legible table config for serious play |
| Later | Penetration / cut card, reshuffle policy | Real shoe discipline |
| Later | Hand history + session stats (W/L, EV vs play) | Utility for the player, not social noise |
| Later | Multi-hand / seat only if it stays clear | Never at the cost of legibility |

**Out of scope forever (examples):** other casino games, NFT mint spam, generic DeFi dashboard, non-blackjack “metaverse” chrome.

---

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15, React 19, TypeScript |
| Chain UI | wagmi, viem, RainbowKit |
| Table engine | `src/lib/shoe.ts` — shoe, hand value, bust probability, phases |
| Design | Digital Sea CSS tokens — `src/styles/sea.css` |
| Native | Capacitor 7 (iOS / Android) |

---

## Setup

```bash
cd Laboratory/blackjack   # or your clone path
npm install

# optional — WalletConnect Cloud project id for wallet UX
# echo NEXT_PUBLIC_WC_PROJECT_ID=your_id > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Native (optional)

```bash
npm run cap:ios      # build + sync + open Xcode
npm run cap:android  # build + sync + open Android Studio
```

---

## Repo map

```
src/
  app/           # layout, home shell
  components/    # Table, AuthBar, Providers
  lib/           # shoe engine, wagmi config
  styles/        # sea.css — Digital Sea materials
public/          # logo.svg, icon.svg
capacitor.config.ts
.agents/         # agent memory + design/motion skills
```

| Asset | Use |
|-------|-----|
| `public/logo.svg` | App / OG mark |
| `public/icon.svg` | Compact mark / favicon-style |

Agent conventions: `.agents/memory/AGENTS.md`

---

## Product rules (short)

- **Brand** — Digital Sea optical identity; tokens live in CSS (and any DESIGN.md SoT you keep in the lab). Shared family with AstroSleep; this app is still *only* blackjack.  
- **Auth** — SIWE via RainbowKit + WalletConnect; GitHub as secondary path.  
- **Math** — Prefer exact remaining-shoe combinatorics; never fake EV.  
- **Motion** — Smooth, quiet, interruptible — not casino neon.  
- **Scope** — If it is not blackjack utility or session rails for play, cut it.

---

## Status

- [x] Project scaffold + Digital Sea theme  
- [x] Multi-deck shoe, hit / stand, settle, bankroll  
- [x] Odds panel: P(bust on next hit) from remaining cards  
- [x] RainbowKit connect (dark Digital Sea theme)  
- [x] Capacitor shell hooks (iOS / Android)  
- [x] GitHub button (placeholder for NextAuth)  
- [ ] Full SIWE session cookie + server verify  
- [ ] On-chain buy-in / cashout  
- [ ] Double / split / insurance  
- [ ] Full basic-strategy EV table  
- [ ] Rule config (H17/S17, DAS, surrender, decks, penetration)  

---

Built for people who want a **clean table** and a **serious engine** — web3 identity included, spectacle excluded.
