"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Auth surface: SIWE path via RainbowKit + WalletConnect.
 * GitHub OAuth can be added as a second provider (NextAuth) without changing layout.
 */
export function AuthBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <ConnectButton
        chainStatus="icon"
        accountStatus="address"
        showBalance={false}
      />
      <a
        href="https://github.com/login"
        className="sea-btn secondary"
        style={{ textDecoration: "none", fontSize: 13, padding: "10px 14px" }}
        title="GitHub sign-in (wire NextAuth in a follow-up)"
      >
        GitHub
      </a>
    </div>
  );
}
