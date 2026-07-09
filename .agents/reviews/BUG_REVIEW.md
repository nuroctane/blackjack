# Massive bug review — Digital Sea Blackjack

**Date:** 2026-07-09  
**Rev:** `main` @ `f016c4d`  
**Scope:** `shoe.ts` engine, Table UX, SIWE/auth, Cap shells  

Severity: **P0** · **P1** · **P2** · **P3**

---

## Executive summary

Shoe integrity (prior P0 mid-hand reshuffle) remains **fixed**. Double-down ledger math is consistent for normal play. New **banner tone classifier is inverted** for several loss/push strings. Soft-lock at low bankroll. SIWE remains client-only / forgeable. No engine P0s found.

| Bucket | Count |
|--------|------:|
| P0 | 0 |
| P1 | 4 |
| P2 | 6 |
| P3 | 6 |

---

## P1 — High

### BJ-P1-01 · Settle banner tone inverted
| | |
|---|---|
| **Where** | `Table.tsx` `messageTone` |
| **Evidence** | `"Bust 22. Dealer wins."` → **win** (matches `"win"`); `"Dealer blackjack. Lose 25."` → **win** (matches `"blackjack"` first); push both-BJ → win |
| **Impact** | Losses/pushes get success styling — actively misleading |
| **Fix** | Engine `result: "win"\|"lose"\|"push"\|"bj"` or match lose/push **before** generic win/blackjack |

### BJ-P1-02 · Soft-lock when bankroll &lt; min chip
| | |
|---|---|
| **Where** | Chips fixed `[10,25,50,100]`; `deal` rejects `bet > bankroll`; no rebuy |
| **Impact** | `0 ≤ bankroll < 10` → cannot deal; only full reload restores 1000 |
| **Fix** | Clamp chips / all-in / rebuy; `nextRound` clamp `bet = min(bet, bankroll)` |

### BJ-P1-03 · SIWE forgeable (no verify)
| | |
|---|---|
| **Where** | `siwe.ts` / `SiweButton` — localStorage message+sig; no `verifyMessage`, no server nonce |
| **Impact** | Anyone can write **SIWE ✓**; unsafe for payouts |
| **Fix** | Server verify + HttpOnly cookie; client session UX-only until verify |

### BJ-P1-04 · WalletConnect project id is a fake default
| | |
|---|---|
| **Where** | `wagmi.ts` fallback `"demo_digital_sea_blackjack"` |
| **Impact** | Connect fails/unreliable without real Cloud project id |
| **Fix** | Require `NEXT_PUBLIC_WC_PROJECT_ID`; fail fast if missing |

---

## P2 — Medium

| ID | Issue | Impact |
|----|--------|--------|
| BJ-P2-01 | Android Cap theme still Light.DarkActionBar; no edge-to-edge | Light chrome / insets 0 |
| BJ-P2-02 | iOS no `UIUserInterfaceStyle=Dark` | Launch flash / status bar |
| BJ-P2-03 | SIWE restore ignores `chainId` | SIWE ✓ after chain switch |
| BJ-P2-04 | Cap deep-link / WC return not wired | Mobile wallet hop breaks |
| BJ-P2-05 | Client `Math.random` shoe | Not OK for real stakes |
| BJ-P2-06 | Hit/double bust skip unified `settle()` | Message inconsistency (feeds P1-01) |

---

## P3 — Polish

| ID | Issue |
|----|--------|
| BJ-P3-01 | BJ 3:2 `floor(bet*2.5)` shortchanges odd bets (25→37 not 37.5) |
| BJ-P3-02 | Disconnect clears SIWE (strict reconnect) |
| BJ-P3-03 | Session expiry not watched while tab open |
| BJ-P3-04 | `nextCardBustProb` empty shoe → 0 |
| BJ-P3-05 | GitHub chip is login URL, not OAuth |
| BJ-P3-06 | Tests RNG-gated; no deterministic settle/double/H17 suite |

---

## Engine notes (not bugs)

- Double: post-deal extra stake, doubled `bet`, settle vs new stake — correct  
- Deal BJ peek → immediate settle — correct for this ruleset  
- H17 flag + soft-17 hit — correct  
- Mid-hand empty shoe rebuild excluding in-play multiset — holds  
- Phase guards on deal/hit/stand/double — hold  

---

## Suggested fix order

1. BJ-P1-01 structured settle result + tone  
2. BJ-P1-02 bankroll clamp / rebuy  
3. BJ-P1-04 real WC id; BJ-P1-03 SIWE server before trust  
4. Cap dark shells + chainId bind  
5. Deterministic engine tests  
