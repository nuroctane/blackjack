import Image from "next/image";
import { AuthBar } from "@/components/AuthBar";
import { Table } from "@/components/Table";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px 64px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo.svg" alt="Digital Sea Blackjack" width={48} height={48} priority />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>
              Digital Sea Blackjack
            </div>
            <div style={{ color: "#9AA8C0", fontSize: 13 }}>
              SIWE · WalletConnect · odds-first table
            </div>
          </div>
        </div>
        <AuthBar />
      </header>

      <section className="sea-glass" style={{ padding: 16, marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#9AA8C0", fontSize: 14, lineHeight: 1.5 }}>
          Family brand tokens match AstroSleep / Digital Sea (
          <span style={{ color: "#5856D6" }}>#5856D6</span>). Auth: wallet (RainbowKit /
          WalletConnect) + GitHub. On-chain payments and SIWE session hardening land in the next
          slice — table math and odds panel ship first.
        </p>
      </section>

      <Table />
    </main>
  );
}
