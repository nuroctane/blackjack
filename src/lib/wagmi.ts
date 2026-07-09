import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum } from "wagmi/chains";

/**
 * WalletConnect Cloud project id.
 * Set NEXT_PUBLIC_WC_PROJECT_ID in env (UUID-like hex from cloud.walletconnect.com).
 * Fake defaults break RainbowKit connect — we refuse non-hex ids.
 */
function resolveProjectId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WC_PROJECT_ID?.trim() || "";
  if (/^[a-f0-9]{32}$/i.test(fromEnv)) return fromEnv;
  // Public WalletConnect sample id used in many RainbowKit demos (replace in prod)
  const demo = "3a8170812b534d0ff9d794f19a901d64";
  if (typeof console !== "undefined") {
    console.warn(
      "[blackjack] NEXT_PUBLIC_WC_PROJECT_ID missing or invalid — using demo WC project id. Set a real Cloud id for production.",
    );
  }
  return demo;
}

export const wagmiConfig = getDefaultConfig({
  appName: "Digital Sea Blackjack",
  projectId: resolveProjectId(),
  chains: [mainnet, base, arbitrum],
  ssr: true,
});
