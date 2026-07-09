/**
 * Client-side SIWE (EIP-4361) helpers.
 * Signs a standard message with the connected wallet and stores a local session.
 * Server-side verify should be added before trusting for payments.
 */

export type SiweSession = {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  issuedAt: string;
  expirationTime: string;
};

const STORAGE_KEY = "ds_bj_siwe_session_v1";

export function buildSiweMessage(params: {
  domain: string;
  address: `0x${string}`;
  statement?: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt?: string;
  expirationTime?: string;
}): string {
  const issuedAt = params.issuedAt ?? new Date().toISOString();
  const expirationTime =
    params.expirationTime ??
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const statement =
    params.statement ??
    "Sign in to Digital Sea Blackjack. This proves you control this wallet.";

  // EIP-4361 format
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    "",
    statement,
    "",
    `URI: ${params.uri}`,
    `Version: 1`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationTime}`,
  ].join("\n");
}

export function randomNonce(len = 16): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function saveSession(session: SiweSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): SiweSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SiweSession;
    if (new Date(s.expirationTime).getTime() < Date.now()) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function sessionMatchesAddress(
  session: SiweSession | null,
  address: string | undefined,
): boolean {
  if (!session || !address) return false;
  return session.address.toLowerCase() === address.toLowerCase();
}
