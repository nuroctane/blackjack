"use client";

import { useMemo, useState } from "react";
import {
  deal,
  hit,
  handValue,
  nextCardBustProb,
  nextRound,
  newTable,
  stand,
  type TableState,
} from "@/lib/shoe";

function CardView({ rank, suit, hidden }: { rank?: string; suit?: string; hidden?: boolean }) {
  if (hidden) {
    return (
      <div
        className="sea-glass"
        style={{
          width: 64,
          height: 90,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(145deg,#121A2B,#1A2438)",
          borderColor: "#5856D655",
        }}
      >
        <span style={{ color: "#5856D6", fontSize: 20 }}>✦</span>
      </div>
    );
  }
  const red = suit === "♥" || suit === "♦";
  return (
    <div
      className="sea-glass"
      style={{
        width: 64,
        height: 90,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: red ? "#FF6B6B" : "#E8EEF8",
      }}
    >
      <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
        {rank}
        {suit}
      </span>
      <span style={{ fontSize: 22, alignSelf: "center" }}>{suit}</span>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700, alignSelf: "flex-end" }}>
        {rank}
        {suit}
      </span>
    </div>
  );
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

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="sea-glass" style={{ padding: 20 }}>
        <div style={{ color: "#9AA8C0", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Dealer {t.phase !== "betting" && !hideHole ? `· ${dVal.total}` : hideHole && t.dealer[0] ? "· ?" : ""}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, minHeight: 90 }}>
          {t.dealer.map((c, i) => (
            <CardView key={c.id} rank={c.rank} suit={c.suit} hidden={hideHole && i === 1} />
          ))}
          {t.dealer.length === 0 && <span style={{ color: "#6B7A94" }}>—</span>}
        </div>
      </div>

      <div className="sea-glass" style={{ padding: 20 }}>
        <div style={{ color: "#9AA8C0", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          You {t.player.length ? `· ${pVal.total}${pVal.soft ? " soft" : ""}` : ""}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, minHeight: 90 }}>
          {t.player.map((c) => (
            <CardView key={c.id} rank={c.rank} suit={c.suit} />
          ))}
          {t.player.length === 0 && <span style={{ color: "#6B7A94" }}>—</span>}
        </div>
      </div>

      <div
        className="sea-glass"
        style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <div>
          <div style={{ color: "#6B7A94", fontSize: 11 }}>Bankroll</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {t.bankroll}
          </div>
        </div>
        <div>
          <div style={{ color: "#6B7A94", fontSize: 11 }}>Bet</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {t.bet}
          </div>
        </div>
        <div>
          <div style={{ color: "#6B7A94", fontSize: 11 }}>Shoe left</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
            {t.shoe.length}
          </div>
        </div>
        {bustP !== null && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ color: "#6B7A94", fontSize: 11 }}>P(bust on hit)</div>
            <div className="mono" style={{ fontSize: 20, color: "#5AC8FA", fontWeight: 600 }}>
              {(bustP * 100).toFixed(1)}%
            </div>
            <div style={{ color: "#6B7A94", fontSize: 12, marginTop: 4 }}>
              Exact from remaining cards — combinatorial, not full strategy EV.
            </div>
          </div>
        )}
      </div>

      <p style={{ color: "#9AA8C0", margin: 0, minHeight: 24 }}>{t.message}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {t.phase === "betting" && (
          <>
            {[10, 25, 50, 100].map((b) => (
              <button
                key={b}
                type="button"
                className="sea-btn secondary"
                onClick={() => setT((s) => ({ ...s, bet: b }))}
                style={t.bet === b ? { borderColor: "#5856D6", background: "#5856D633" } : undefined}
              >
                {b}
              </button>
            ))}
            <button type="button" className="sea-btn" onClick={() => setT((s) => deal(s))}>
              Deal
            </button>
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
          </>
        )}
        {t.phase === "settled" && (
          <button type="button" className="sea-btn" onClick={() => setT((s) => nextRound(s))}>
            Next hand
          </button>
        )}
      </div>
    </div>
  );
}
