# Blackjack - Digital Sea 

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

## Native (iOS / Android)

Capacitor shells with liquid-glass web UI + status bar / splash themed to Digital Sea void.

```bash
npm run build          # static export → out/
npx cap sync
npx cap open ios       # needs Xcode + CocoaPods on macOS
npx cap open android   # needs Android Studio
```

App ID: `xyz.nuroctane.blackjack`

## UI craft sources

Agent skills installed under `.agents/skills/`:

- [emilkowalski/skills](https://github.com/emilkowalski/skills) — `apple-design` (WWDC fluid interfaces), `emil-design-eng`, `animation-vocabulary`, `review-animations`
- Family tokens: Obsidian `Building & Projects/DESIGN.md`

## Status (v0.1 → native-ready)

- [x] Project scaffold + sea theme + liquid glass CSS materials  
- [x] Multi-deck shoe, hit/stand, settle, bankroll  
- [x] Odds panel: P(bust on next hit) from remaining cards  
- [x] RainbowKit connect (Digital Sea themed)  
- [x] Capacitor iOS + Android projects synced  
- [x] Safe-area, press scale 0.97, reduced-motion / reduced-transparency  
- [ ] Full SIWE session cookie + server verify  
- [ ] On-chain buy-in / cashout  
- [ ] Double / split / insurance  
- [ ] Full basic-strategy EV table  
