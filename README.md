# Digital Sea Blackjack

Native-feeling web blackjack under the **Digital Sea** brand family (shared with AstroSleep).

## Product rules (from Tasks.md)

- Unified branding / Digital Sea optical identity (`DESIGN.md` tokens)
- Auth: **SIWE** via **RainbowKit + WalletConnect**, plus **GitHub**
- Accurate deck / odds UI (combinatorial bust % from remaining shoe)
- Smooth, quiet motion — not casino neon

## Stack

- Next.js 15 + React 19 + TypeScript  
- wagmi + viem + RainbowKit  
- CSS Digital Sea tokens (`src/styles/sea.css`)

## Setup

```bash
cd Laboratory/blackjack
npm install
# optional: WalletConnect Cloud project id
# echo NEXT_PUBLIC_WC_PROJECT_ID=your_id > .env.local
npm run dev
```

Open http://localhost:3000

## Logos

| File | Use |
|------|-----|
| `public/logo.svg` | App / OG mark |
| `public/icon.svg` | Favicon-style |

## Agent notes

`.agents/memory/AGENTS.md`

## Status (v0.1)

- [x] Project scaffold + sea theme  
- [x] Multi-deck shoe, hit/stand, settle, bankroll  
- [x] Odds panel: P(bust on next hit) from remaining cards  
- [x] RainbowKit connect (dark Digital Sea theme)  
- [x] GitHub button (placeholder for NextAuth)  
- [ ] Full SIWE session cookie + server verify  
- [ ] On-chain buy-in / cashout  
- [ ] Double / split / insurance  
- [ ] Full basic-strategy EV table  
