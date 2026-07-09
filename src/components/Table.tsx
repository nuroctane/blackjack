"use client";

import { useMemo, useState } from "react";
import {
  canDouble,
  deal,
  doubleDown,
  hit,
  handValue,
  nextCardBustProb,
  nextRound,
  newTable,
  rebuy,
  stand,
  type HandResult,
  type TableState,
} from "@/lib/shoe";

const CHIPS = [10, 25, 50, 100] as const;

function CardView({
  rank,
  suit,
  hidden,
  delay = 0,
}: {
  rank?: string;
  suit?: string;
  hidden?: boolean;
  delay?: number;
}) {
  if (hidden) {
    return (
      <div
        className="card-face sea-glass"
        style={{
          animationDelay: `${delay}ms`,
          background:
            "linear-gradient(145deg, rgba(88,86,214,0.25), rgba(18,26,43,0.95))",
          borderColor: "rgba(88,86,214,0.45)",
          placeItems: "center",
          display: "grid",
        }}
      >
        <span style={{ color: "#5AC8FA", fontSize: 22, opacity: 0.9 }}>✦</span>
      </div>
    );
  }
  const red = suit === "♥" || suit === "♦";
  return (
    <div
      className="card-face sea-glass"
      style={{
        animationDelay: `${delay}ms`,
        color: red ? "var(--sea-heart)" : "var(--sea-text)",
      }}
    >
      <span className="mono" style={{ fontSize: 15, fontWeight: 700 }}>
        {rank}
        {suit}
      </span>
      <span style={{ fontSize: 26, alignSelf: "center", lineHeight: 1 }}>{suit}</span>
      <span
        className="mono"
        style={{ fontSize: 15, fontWeight: 700, alignSelf: "flex-end", transform: "rotate(180deg)" }}
      >
        {rank}
        {suit}
      </span>
    </div>
  );
}

function resultTone(result: HandResult): "win" | "loss" | "push" | "neutral" {
  if (result === "win" || result === "bj") return "win";
  if (result === "lose") return "loss";
  if (result === "push") return "push";
  return "neutral";
}

export function Table() {
  const [t, setT] = useState<TableState>(() => newTable(6, 1000));

  const pVal = useMemo(() => handValue(t.player), [t.player]);
  const dVal = useMemo(() => handValue(t.dealer), [t.dealer]);
  const hideHole = t.phase === "player" || t.phase === "betting";
  const bustP = useMemo(
    () => (t.phase === "player" ? nextCardBustProb(t.player, t.shoe) : null),
    [t],
  );
  const showDouble = canDouble(t);
  const tone = t.phase === "settled" ? resultTone(t.result) : "neutral";
  const affordableChips = CHIPS.filter((b) => b <= t.bankroll);
  const canDeal = t.phase === "betting" && t.bet > 0 && t.bet <= t.bankroll && t.bankroll > 0;

  return (
    <div style={{ display: "grid", gap: 16 }} className="sea-stagger">
      <div
        className="sea-glass-thick sea-glass"
        style={{
          padding: "22px 18px 20px",
          borderRadius: "var(--radius-lg)",
          background:
            "linear-gradient(180deg, rgba(18,40,36,0.55) 0%, rgba(11,18,32,0.75) 100%)",
        }}
      >
        <div
          style={{
            color: "var(--sea-muted)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Dealer
          {t.phase !== "betting" && !hideHole ? (
            <span className="mono" style={{ color: "var(--sea-text)", marginLeft: 8 }}>
              {dVal.total}
            </span>
          ) : hideHole && t.dealer[0] ? (
            <span style={{ marginLeft: 8 }}>· upcard</span>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 10, minHeight: 100, flexWrap: "wrap" }}>
          {t.dealer.map((c, i) => (
            <CardView
              key={c.id}
              rank={c.rank}
              suit={c.suit}
              hidden={hideHole && i === 1}
              delay={i * 45}
            />
          ))}
          {t.dealer.length === 0 && (
            <span style={{ color: "var(--sea-faint)", alignSelf: "center" }}>Waiting for deal…</span>
          )}
        </div>

        <div style={{ height: 28 }} />

        <div
          style={{
            color: "var(--sea-muted)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          You
          {t.player.length > 0 && (
            <span className="mono" style={{ color: "var(--sea-biolume)", marginLeft: 8 }}>
              {pVal.total}
              {pVal.soft ? " soft" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, minHeight: 100, flexWrap: "wrap" }}>
          {t.player.map((c, i) => (
            <CardView key={c.id} rank={c.rank} suit={c.suit} delay={i * 45} />
          ))}
          {t.player.length === 0 && (
            <span style={{ color: "var(--sea-faint)", alignSelf: "center" }}>—</span>
          )}
        </div>
      </div>

      <div
        className="sea-glass"
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <Stat label="Bankroll" value={String(t.bankroll)} />
        <Stat label="Bet" value={String(t.bet)} accent />
        <Stat label="Shoe" value={String(t.shoe.length)} />
        {bustP !== null && (
          <div style={{ gridColumn: "1 / -1", paddingTop: 4 }}>
            <div style={{ color: "var(--sea-faint)", fontSize: 11, letterSpacing: "0.06em" }}>
              P(BUST ON HIT)
            </div>
            <div className="mono display" style={{ color: "var(--sea-biolume)", marginTop: 4 }}>
              {(bustP * 100).toFixed(1)}%
            </div>
            <div style={{ color: "var(--sea-muted)", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
              Exact from remaining cards — combinatorial, not full strategy EV.
            </div>
            <div
              className="sea-meter"
              style={{ marginTop: 10 }}
              role="meter"
              aria-valuenow={Math.round(bustP * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Bust probability"
            >
              <div className="sea-meter-fill" style={{ width: `${Math.min(100, bustP * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {t.message && (
        <div
          className={`sea-banner sea-banner--${tone === "loss" ? "loss" : tone === "win" ? "win" : tone === "push" ? "push" : "neutral"}`}
          role="status"
          aria-live="polite"
        >
          {t.message}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {t.phase === "betting" && (
          <>
            {affordableChips.map((b) => (
              <button
                key={b}
                type="button"
                className="sea-chip"
                data-active={t.bet === b}
                onClick={() => setT((s) => ({ ...s, bet: b }))}
              >
                {b}
              </button>
            ))}
            {t.bankroll > 0 && t.bankroll < 10 && (
              <button
                type="button"
                className="sea-chip"
                data-active={t.bet === t.bankroll}
                onClick={() => setT((s) => ({ ...s, bet: s.bankroll }))}
              >
                All-in {t.bankroll}
              </button>
            )}
            <button
              type="button"
              className="sea-btn"
              disabled={!canDeal}
              onClick={() => setT((s) => deal(s))}
            >
              Deal
            </button>
            {t.bankroll < 10 && (
              <button type="button" className="sea-btn secondary" onClick={() => setT((s) => rebuy(s))}>
                Rebuy +1000
              </button>
            )}
          </>
        )}
        {t.phase === "player" && (
          <>
            <button type="button" className="sea-btn" onClick={() => setT((s) => hit(s))}>
              Hit
            </button>
            <button type="button" className="sea-btn secondary" onClick={() => setT((s) => stand(s))}>
              Stand
            </button>
            {showDouble && (
              <button
                type="button"
                className="sea-btn secondary"
                onClick={() => setT((s) => doubleDown(s))}
              >
                Double
              </button>
            )}
          </>
        )}
        {t.phase === "settled" && (
          <>
            <button type="button" className="sea-btn" onClick={() => setT((s) => nextRound(s))}>
              Next hand
            </button>
            {t.bankroll < 10 && (
              <button type="button" className="sea-btn secondary" onClick={() => setT((s) => rebuy(s))}>
                Rebuy +1000
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ color: "var(--sea-faint)", fontSize: 11, letterSpacing: "0.06em" }}>{label}</div>
      <div
        className="mono"
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginTop: 4,
          color: accent ? "var(--sea-accent)" : "var(--sea-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
