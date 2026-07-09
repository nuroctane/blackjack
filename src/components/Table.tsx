"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyRules,
  canDouble,
  canSplit,
  canSurrender,
  deal,
  dealerOutcomeDist,
  declineInsurance,
  DEFAULT_RULES,
  doubleDown,
  EMPTY_STATS,
  handValue,
  hiLoCount,
  hit,
  isBlackjack,
  newTable,
  nextCardBustProb,
  nextRound,
  rebuy,
  split,
  stand,
  standEV,
  surrender,
  takeInsurance,
  type HandResult,
  type Rules,
  type SessionStats,
  type TableState,
} from "@/lib/shoe";
import { advise, ADVICE_LABEL } from "@/lib/strategy";

const CHIPS = [10, 25, 50, 100] as const;
const PERSIST_KEY = "ds_bj_table_v2";

type Persisted = {
  bankroll: number;
  bet: number;
  rules: Rules;
  stats: SessionStats;
};

function loadPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (typeof p.bankroll !== "number" || !p.rules || typeof p.rules.decks !== "number") return null;
    return {
      bankroll: p.bankroll,
      bet: typeof p.bet === "number" ? p.bet : 25,
      rules: { ...DEFAULT_RULES, ...p.rules },
      stats: { ...EMPTY_STATS, ...(p.stats || {}) },
    };
  } catch {
    return null;
  }
}

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
  if (result === "push" || result === "surrender") return "push";
  return "neutral";
}

const sectionLabel: React.CSSProperties = {
  color: "var(--sea-muted)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 12,
};

export function Table() {
  const [t, setT] = useState<TableState>(() => newTable(DEFAULT_RULES, 1000));
  const [showAdvisor, setShowAdvisor] = useState(true);
  const [showCount, setShowCount] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [draftRules, setDraftRules] = useState<Rules>(DEFAULT_RULES);
  const hydrated = useRef(false);

  // Restore bankroll / bet / rules / stats between sessions (demo persistence).
  useEffect(() => {
    const p = loadPersisted();
    if (p) {
      setT((s) => ({
        ...newTable(p.rules, p.bankroll),
        bet: Math.min(p.bet, p.bankroll) || Math.min(25, p.bankroll),
        stats: p.stats,
        message: s.message,
      }));
      setDraftRules(p.rules);
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    const p: Persisted = { bankroll: t.bankroll, bet: t.bet, rules: t.rules, stats: t.stats };
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable */
    }
  }, [t.bankroll, t.bet, t.rules, t.stats]);

  const dVal = useMemo(() => handValue(t.dealer), [t.dealer]);
  const hideHole = t.phase === "player" || t.phase === "betting" || t.phase === "insurance";
  const activeHand = t.hands[t.active];

  const bustP = useMemo(
    () => (t.phase === "player" && activeHand ? nextCardBustProb(activeHand.cards, t.shoe) : null),
    [t, activeHand],
  );
  const dealerDist = useMemo(
    () => (t.phase === "player" && t.dealer[0] ? dealerOutcomeDist(t.dealer[0], t.shoe, t.rules) : null),
    [t],
  );
  const evStand = useMemo(() => {
    if (!dealerDist || !activeHand) return null;
    return standEV(handValue(activeHand.cards).total, dealerDist);
  }, [dealerDist, activeHand]);
  const count = useMemo(() => (showCount ? hiLoCount(t) : null), [showCount, t]);
  const advice = useMemo(() => (showAdvisor ? advise(t) : null), [showAdvisor, t]);

  const showDouble = canDouble(t);
  const showSplit = canSplit(t);
  const showSurrender = canSurrender(t);
  const tone = t.phase === "settled" ? resultTone(t.result) : "neutral";
  const affordableChips = CHIPS.filter((b) => b <= t.bankroll);
  const canDeal = t.phase === "betting" && t.bet > 0 && t.bet <= t.bankroll && t.bankroll > 0;
  const playerHasBJ = t.hands[0] ? isBlackjack(t.hands[0].cards) : false;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      setT((s) => {
        if (s.phase === "player") {
          if (k === "h") return hit(s);
          if (k === "s") return stand(s);
          if (k === "d" && canDouble(s)) return doubleDown(s);
          if (k === "p" && canSplit(s)) return split(s);
          if (k === "r" && canSurrender(s)) return surrender(s);
        }
        if (s.phase === "insurance") {
          if (k === "y") return takeInsurance(s);
          if (k === "n") return declineInsurance(s);
        }
        if (k === "enter") {
          if (s.phase === "betting" && s.bet > 0 && s.bet <= s.bankroll) return deal(s);
          if (s.phase === "settled") return nextRound(s);
        }
        return s;
      });
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const applyDraftRules = () => {
    setT((s) => applyRules(s, draftRules));
    setRulesOpen(false);
  };

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
        <div style={sectionLabel}>
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

        {t.hands.length === 0 ? (
          <>
            <div style={sectionLabel}>You</div>
            <div style={{ display: "flex", gap: 10, minHeight: 100, flexWrap: "wrap" }}>
              <span style={{ color: "var(--sea-faint)", alignSelf: "center" }}>—</span>
            </div>
          </>
        ) : (
          t.hands.map((h, hi) => {
            const hv = handValue(h.cards);
            const isActive = t.phase === "player" && hi === t.active;
            return (
              <div key={hi} style={{ marginBottom: hi < t.hands.length - 1 ? 18 : 0 }}>
                <div style={sectionLabel}>
                  {t.hands.length > 1 ? `Hand ${hi + 1}` : "You"}
                  <span
                    className="mono"
                    style={{
                      color: isActive || t.hands.length === 1 ? "var(--sea-biolume)" : "var(--sea-muted)",
                      marginLeft: 8,
                    }}
                  >
                    {hv.total}
                    {hv.soft ? " soft" : ""}
                  </span>
                  <span className="mono" style={{ color: "var(--sea-faint)", marginLeft: 8 }}>
                    bet {h.bet}
                  </span>
                  {h.doubled && <span style={{ marginLeft: 8, color: "var(--sea-accent)" }}>2×</span>}
                  {h.surrendered && (
                    <span style={{ marginLeft: 8, color: "var(--sea-muted)" }}>surrendered</span>
                  )}
                  {isActive && t.hands.length > 1 && (
                    <span style={{ marginLeft: 8, color: "var(--sea-biolume)" }}>← playing</span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    minHeight: 100,
                    flexWrap: "wrap",
                    opacity: t.hands.length > 1 && !isActive && t.phase === "player" ? 0.55 : 1,
                    transition: "opacity var(--dur-ui) ease",
                  }}
                >
                  {h.cards.map((c, i) => (
                    <CardView key={c.id} rank={c.rank} suit={c.suit} delay={i * 45} />
                  ))}
                </div>
              </div>
            );
          })
        )}
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
        {t.phase === "player" && (
          <div style={{ gridColumn: "1 / -1", paddingTop: 4 }}>
            {bustP !== null && (
              <>
                <div style={{ color: "var(--sea-faint)", fontSize: 11, letterSpacing: "0.06em" }}>
                  P(BUST ON HIT)
                </div>
                <div className="mono display" style={{ color: "var(--sea-biolume)", marginTop: 4 }}>
                  {(bustP * 100).toFixed(1)}%
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
              </>
            )}
            {dealerDist && evStand !== null && (
              <div
                className="mono"
                style={{
                  display: "flex",
                  gap: 18,
                  flexWrap: "wrap",
                  marginTop: 12,
                  fontSize: 13,
                  color: "var(--sea-muted)",
                }}
              >
                <span>
                  P(dealer bust){" "}
                  <span style={{ color: "var(--sea-text)" }}>{(dealerDist.bust * 100).toFixed(1)}%</span>
                </span>
                <span>
                  Stand EV{" "}
                  <span style={{ color: evStand >= 0 ? "var(--sea-success)" : "var(--sea-danger)" }}>
                    {evStand >= 0 ? "+" : ""}
                    {(evStand * 100).toFixed(1)}%
                  </span>
                </span>
                {count && (
                  <span>
                    Hi-Lo <span style={{ color: "var(--sea-text)" }}>{count.running >= 0 ? "+" : ""}{count.running}</span>
                    {" · true "}
                    <span style={{ color: "var(--sea-text)" }}>
                      {count.true >= 0 ? "+" : ""}
                      {count.true.toFixed(1)}
                    </span>
                  </span>
                )}
              </div>
            )}
            <div style={{ color: "var(--sea-muted)", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
              Bust %, dealer distribution, and stand EV are exact from remaining shoe composition
              (post-peek conditional). Advisor is the published basic-strategy chart.
            </div>
            {advice && (
              <div
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--sea-accent-soft)",
                  background: "var(--sea-accent-soft)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--sea-muted)" }}>Chart says</span>
                <span className="mono" style={{ color: "var(--sea-text)", fontWeight: 700 }}>
                  {ADVICE_LABEL[advice]}
                </span>
              </div>
            )}
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
        {t.phase === "insurance" && (
          <>
            <button type="button" className="sea-btn" onClick={() => setT((s) => takeInsurance(s))}>
              {playerHasBJ ? "Even money" : `Insure ${Math.ceil(t.bet / 2)}`}
            </button>
            <button
              type="button"
              className="sea-btn secondary"
              onClick={() => setT((s) => declineInsurance(s))}
            >
              No insurance
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
            {showDouble && (
              <button
                type="button"
                className="sea-btn secondary"
                onClick={() => setT((s) => doubleDown(s))}
              >
                Double
              </button>
            )}
            {showSplit && (
              <button type="button" className="sea-btn secondary" onClick={() => setT((s) => split(s))}>
                Split
              </button>
            )}
            {showSurrender && (
              <button
                type="button"
                className="sea-btn secondary"
                onClick={() => setT((s) => surrender(s))}
              >
                Surrender
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

      <div
        className="sea-glass"
        style={{
          padding: "14px 16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
        }}
      >
        <span className="mono" style={{ color: "var(--sea-muted)" }}>
          Session{" "}
          <span style={{ color: "var(--sea-text)" }}>
            {t.stats.wins}W–{t.stats.losses}L–{t.stats.pushes}P
          </span>
          {" · BJ "}
          <span style={{ color: "var(--sea-text)" }}>{t.stats.blackjacks}</span>
          {" · net "}
          <span style={{ color: t.stats.net >= 0 ? "var(--sea-success)" : "var(--sea-danger)" }}>
            {t.stats.net >= 0 ? "+" : ""}
            {t.stats.net}
          </span>
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--sea-muted)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showAdvisor}
            onChange={(e) => setShowAdvisor(e.target.checked)}
          />
          Advisor
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--sea-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={showCount} onChange={(e) => setShowCount(e.target.checked)} />
          Count
        </label>
        <button
          type="button"
          className="sea-chip"
          onClick={() => {
            setDraftRules(t.rules);
            setRulesOpen((v) => !v);
          }}
          disabled={t.phase !== "betting" && t.phase !== "settled"}
        >
          Rules
        </button>
      </div>

      {rulesOpen && (
        <div className="sea-glass" style={{ padding: 16, display: "grid", gap: 14 }}>
          <div style={sectionLabel}>Table rules — applies with a fresh shoe</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
            <RuleSelect
              label="Decks"
              value={String(draftRules.decks)}
              options={[["1", "1"], ["2", "2"], ["4", "4"], ["6", "6"], ["8", "8"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, decks: Number(v) }))}
            />
            <RuleSelect
              label="Soft 17"
              value={draftRules.dealerHitsSoft17 ? "h17" : "s17"}
              options={[["h17", "Dealer hits (H17)"], ["s17", "Dealer stands (S17)"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, dealerHitsSoft17: v === "h17" }))}
            />
            <RuleSelect
              label="Blackjack pays"
              value={String(draftRules.blackjackPayout)}
              options={[["1.5", "3:2"], ["1.2", "6:5"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, blackjackPayout: Number(v) }))}
            />
            <RuleSelect
              label="Double"
              value={draftRules.doubleAllowed}
              options={[["any2", "Any two"], ["9to11", "9–11 only"], ["10to11", "10–11 only"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, doubleAllowed: v as Rules["doubleAllowed"] }))}
            />
            <RuleSelect
              label="Double after split"
              value={draftRules.doubleAfterSplit ? "yes" : "no"}
              options={[["yes", "Allowed (DAS)"], ["no", "Not allowed"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, doubleAfterSplit: v === "yes" }))}
            />
            <RuleSelect
              label="Split to"
              value={String(draftRules.maxHands)}
              options={[["2", "2 hands"], ["3", "3 hands"], ["4", "4 hands"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, maxHands: Number(v) }))}
            />
            <RuleSelect
              label="Split aces"
              value={draftRules.hitSplitAces ? "hit" : "one"}
              options={[["one", "One card each"], ["hit", "May hit"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, hitSplitAces: v === "hit" }))}
            />
            <RuleSelect
              label="Late surrender"
              value={draftRules.lateSurrender ? "yes" : "no"}
              options={[["yes", "Allowed"], ["no", "Not allowed"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, lateSurrender: v === "yes" }))}
            />
            <RuleSelect
              label="Insurance"
              value={draftRules.insurance ? "yes" : "no"}
              options={[["yes", "Offered"], ["no", "Not offered"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, insurance: v === "yes" }))}
            />
            <RuleSelect
              label="Penetration"
              value={String(draftRules.penetration)}
              options={[["0.5", "50%"], ["0.65", "65%"], ["0.75", "75%"], ["0.85", "85%"]]}
              onChange={(v) => setDraftRules((r) => ({ ...r, penetration: Number(v) }))}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="sea-btn" onClick={applyDraftRules}>
              Apply — fresh shoe
            </button>
            <button type="button" className="sea-btn secondary" onClick={() => setRulesOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "var(--sea-faint)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "var(--sea-surface)",
          color: "var(--sea-text)",
          border: "1px solid var(--sea-border)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 12px",
          fontSize: 13,
          fontFamily: "var(--font)",
        }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
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
