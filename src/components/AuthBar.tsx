"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiweButton } from "@/components/SiweButton";

export function AuthBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <SiweButton />
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;
          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button type="button" className="sea-btn" onClick={openConnectModal}>
                      Connect wallet
                    </button>
                  );
                }
                if (chain.unsupported) {
                  return (
                    <button type="button" className="sea-btn secondary" onClick={openChainModal}>
                      Wrong network
                    </button>
                  );
                }
                return (
                  <button type="button" className="sea-chip" data-active="true" onClick={openAccountModal}>
                    {account.displayName}
                  </button>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
      <a
        href="https://github.com/login"
        className="sea-chip"
        style={{ textDecoration: "none" }}
        title="GitHub OAuth — wire NextAuth next"
      >
        GitHub
      </a>
    </div>
  );
}
