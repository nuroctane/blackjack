# Digital Sea — Blackjack Design System

> Agent-oriented SoT. Shared with AstroSleep family tokens.
> Skills: emilkowalski/skills · apple-design · animation-vocabulary.
> Bookmarks: VoltAgent/awesome-design-md, OriginKit, Design Spells, TourKit.

## Product feel

**Under-the-hood presence.** One felt, one hand, maximum legibility.
Dark field, glass materials, mono stats, restrained motion. Not casino neon.

**Brand mark:** Ace–King fan on void navy (biolume edge). Masters under `branding/blackjack-logo*.png`.

## Tokens

Defined in `src/styles/sea.css`:

| Token | Value |
|-------|-------|
| void / field / surface | `#070b14` / `#0b1220` / `#121a2b` |
| accent | `#5856d6` |
| biolume | `#5ac8fa` |
| heart (red suits) | `#ff6b6b` |
| success / danger | `#34c759` / `#ff453a` |

### Motion tokens

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--dur-press: 140ms;
--dur-ui: 200ms;
```

## Rules (Emil checklist)

| Don't | Do |
|-------|-----|
| `transition: all` | Exact properties only |
| `scale(0)` enter | `scale(0.95)` + opacity |
| `ease-in` on controls | `ease-out` / custom curve |
| UI > 300ms | 140–220ms |
| Hover without media query | `@media (hover: hover) and (pointer: fine)` |
| Ignore reduced motion | Keep fade; drop travel |

## Components

- **`.sea-btn`** — primary pill, press `scale(0.97)`, hover lift on fine pointers
- **`.sea-chip`** — bet chips, `data-active` accent soft fill
- **`.sea-glass` / `.sea-glass-thick`** — liquid materials + reduced-transparency fallback
- **`.card-face`** — deal enter stagger, mono ranks
- **`.sea-toast` / `.sea-banner`** — settle messages, origin-aware feel via opacity+Y

## Table UX

1. Dealer / player labels always scannable; totals mono
2. Bust % only during player phase; honest combinatorial copy
3. Bet chips press-scale; Deal is the only primary at betting
4. Hit primary / Stand secondary during player turn
5. Double when two-card, bet affordable (roadmap: split)
6. Settled: banner + Next hand — no confetti

## Accessibility

- Focus-visible rings on interactive controls
- `prefers-reduced-motion` / `prefers-reduced-transparency`
- Tap highlight disabled; min touch ~44px via padding
- Color not sole suit signal (rank text always present)

## Scope lock

Features must improve play, odds, bankroll, settle, or identity tied to play.
Reject multi-game lobbies, NFT spam, non-blackjack chrome.
