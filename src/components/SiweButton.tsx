"use client";

import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import {
  buildSiweMessage,
  clearSession,
  loadSession,
  randomNonce,
  saveSession,
  sessionMatchesAddress,
  type SiweSession,
} from "@/lib/siwe";

export function SiweButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync, isPending } = useSignMessage();
  const [session, setSession] = useState<SiweSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (sessionMatchesAddress(s, address)) setSession(s);
    else {
      if (s) clearSession();
      setSession(null);
    }
  }, [address]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setError(null);
    try {
      const domain = typeof window !== "undefined" ? window.location.host : "localhost";
      const uri = typeof window !== "undefined" ? window.location.origin : "https://localhost";
      const issuedAt = new Date().toISOString();
      const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const message = buildSiweMessage({
        domain,
        address: address as `0x${string}`,
        uri,
        chainId,
        nonce: randomNonce(),
        issuedAt,
        expirationTime,
      });
      const signature = await signMessageAsync({ message });
      const next: SiweSession = {
        address,
        chainId,
        message,
        signature,
        issuedAt,
        expirationTime,
      };
      saveSession(next);
      setSession(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SIWE failed");
    }
  }, [address, chainId, signMessageAsync]);

  if (!isConnected || !address) return null;

  if (session && sessionMatchesAddress(session, address)) {
    return (
      <button
        type="button"
        className="sea-chip"
        data-active="true"
        onClick={() => {
          clearSession();
          setSession(null);
        }}
        title="Local SIWE session — server verify still required for payments"
      >
        SIWE ✓ · Sign out
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <button type="button" className="sea-btn secondary" disabled={isPending} onClick={signIn}>
        {isPending ? "Signing…" : "Sign in (SIWE)"}
      </button>
      {error && (
        <span style={{ color: "var(--sea-danger)", fontSize: 11, maxWidth: 200 }}>{error}</span>
      )}
    </div>
  );
}
