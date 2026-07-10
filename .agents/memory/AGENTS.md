# Agent notes — Digital Sea Blackjack

## Product

- Brand: Digital Sea (`Building & Projects/DESIGN.md` tokens)
- Auth: SIWE via RainbowKit + WalletConnect; GitHub (NextAuth later)
- Engine epoch: **v0.3** exact EV solver (`blackjack-v0.3-exact-ev-solver.patch`)

## Rules

- Do not invent neon casino branding — sea void / accent `#5856D6` / biolume.
- Exact math lives in `shoe.ts` (odds, dealer dist) + `ev.ts` (action EV). Label split EV as ≈ (independence approximation). Chart in `strategy.ts` is never composition EV.
- Prefer the **player-perspective pool** (`unseenPool` = shoe + hidden hole) for any player-facing probability.
- No secrets in repo; use `.env.local` for `NEXT_PUBLIC_WC_PROJECT_ID`.
- Root markdown: only `README.md`. Everything else under `.agents/`.

## Modules

| Path | Role |
|------|------|
| `src/lib/shoe.ts` | Shoe, rules, multi-hand phases, settle, dealer dist, bust %, Hi-Lo, `unseenPool` |
| `src/lib/ev.ts` | Exact expectimax action EVs (stand/hit/double/surrender exact; split ≈) |
| `src/lib/history.ts` | Hand history + play grading vs exact solve |
| `src/lib/strategy.ts` | Published basic-strategy chart (labeled chart) |
| `scripts/sim.ts` | Edge simulation harness (`npm run sim`) |

## Verify

```bash
npm test          # shoe + ev suites
npm run sim -- 1000 solver
npx tsc --noEmit
npm run build
```
