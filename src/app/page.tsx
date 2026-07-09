import Image from "next/image";
import { AuthBar } from "@/components/AuthBar";
import { Table } from "@/components/Table";

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "20px 16px calc(32px + env(safe-area-inset-bottom))",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="sea-glass"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <Image src="/logo.svg" alt="" width={52} height={52} priority />
          </div>
          <div>
            <h1 className="display" style={{ margin: 0 }}>
              Digital Sea
            </h1>
            <div style={{ color: "var(--sea-muted)", fontSize: 13, marginTop: 2 }}>
              Blackjack · SIWE · odds-first
            </div>
          </div>
        </div>
        <AuthBar />
      </header>

      <section className="sea-glass" style={{ padding: "14px 16px", marginBottom: 18 }}>
        <p style={{ margin: 0, color: "var(--sea-muted)", fontSize: 13.5, lineHeight: 1.5 }}>
          Built on the same Digital Sea identity as AstroSleep — liquid materials, quiet motion
          (Emil / Apple WWDC craft), system-first type. Wallet via RainbowKit + WalletConnect; GitHub
          auth path reserved. Table math ships first; on-chain cashout next.
        </p>
      </section>

      <Table />

      <footer
        style={{
          marginTop: 36,
          color: "var(--sea-faint)",
          fontSize: 12,
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        NATIVE SHELL · CAPACITOR iOS / ANDROID
      </footer>
    </main>
  );
}
