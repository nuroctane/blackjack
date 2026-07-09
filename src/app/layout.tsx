import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "@/styles/sea.css";

export const metadata: Metadata = {
  title: "Digital Sea Blackjack",
  description:
    "Unified Digital Sea blackjack — SIWE (RainbowKit + WalletConnect) and GitHub auth. Accurate shoe odds.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }, { url: "/logo.svg", type: "image/svg+xml" }],
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="sea-app">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
