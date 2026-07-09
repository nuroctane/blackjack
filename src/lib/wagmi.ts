import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum } from "wagmi/chains";

/** WalletConnect project id — set NEXT_PUBLIC_WC_PROJECT_ID for production. */
const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID?.trim() || "demo_digital_sea_blackjack";

export const wagmiConfig = getDefaultConfig({
  appName: "Digital Sea Blackjack",
  projectId,
  chains: [mainnet, base, arbitrum],
  ssr: true,
});
