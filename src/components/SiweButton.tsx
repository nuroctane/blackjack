"use client";

import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useCallback, useEffect, useState } from "react";
import {
  buildSiweMessage,
  clearSession,
  loadSession,
  randomNonce,
  saveSession,
  sessionMatches,
  verifySiweSignature,
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
    if (sessionMatches(s, address, chainId)) setSession(s);
    else {
      // Keep stored session on brief disconnect; clear only on address/chain mismatch
      if (s && address && !sessionMatches(s, address, chainId)) {
        clearSession();
      }
      if (!address) {
        // Soft: keep local session for reconnect same wallet
        if (s && !s.clientVerified) clearSession();
        setSession(null);
        return;
      }
      setSession(null);
    }
  }, [address, chainId]);

  // Expiry while tab open
  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expirationTime).getTime() - Date.now();
    if (ms <= 0) {
      clearSession();
      setSession(null);
      return;
    }
    const t = setTimeout(() => {
      clearSession();
      setSession(null);
    }, Math.min(ms, 2_147_000_000));
    return () => clearTimeout(t);
  }, [session]);

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
      const ok = await verifySiweSignature({ address, message, signature });
      if (!ok) {
        setError("Signature verify failed");
        return;
      }
      const next: SiweSession = {
        address,
        chainId,
        message,
        signature,
        issuedAt,
        expirationTime,
        clientVerified: true,
      };
      saveSession(next);
      setSession(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SIWE failed");
    }
  }, [address, chainId, signMessageAsync]);

  if (!isConnected || !address) return null;

  if (session && sessionMatches(session, address, chainId)) {
    return (
      <button
        type="button"
        className="sea-chip"
        data-active="true"
        onClick={() => {
          clearSession();
          setSession(null);
        }}
        title="Client-verified SIWE — server verify still required for payments"
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
