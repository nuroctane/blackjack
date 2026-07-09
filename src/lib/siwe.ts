/**
 * Client-side SIWE (EIP-4361) helpers.
 * Local session is UX-only until a backend verifies nonce + signature.
 * We still run client verifyMessage so forged localStorage cannot show SIWE ✓.
 */

import { verifyMessage } from "viem";

export type SiweSession = {
  address: string;
  chainId: number;
  message: string;
  signature: string;
  issuedAt: string;
  expirationTime: string;
  /** Client-side verify passed; never trust for payments without server. */
  clientVerified: boolean;
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
    // Reject forgeable sessions that never passed client verify
    if (!s.clientVerified || !s.signature || !s.message) {
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

export function sessionMatches(
  session: SiweSession | null,
  address: string | undefined,
  chainId: number | undefined,
): boolean {
  if (!session || !address || chainId === undefined) return false;
  if (!session.clientVerified) return false;
  if (new Date(session.expirationTime).getTime() < Date.now()) return false;
  return (
    session.address.toLowerCase() === address.toLowerCase() &&
    session.chainId === chainId
  );
}

/** @deprecated use sessionMatches */
export function sessionMatchesAddress(
  session: SiweSession | null,
  address: string | undefined,
): boolean {
  if (!session || !address) return false;
  return session.address.toLowerCase() === address.toLowerCase() && session.clientVerified;
}

export async function verifySiweSignature(session: {
  address: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  try {
    return await verifyMessage({
      address: session.address as `0x${string}`,
      message: session.message,
      signature: session.signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}
