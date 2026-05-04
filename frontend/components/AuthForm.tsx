"use client";

import { useState } from "react";
import type { AuthState } from "@/lib/types";

interface AuthFormProps {
  onAuthenticated: (auth: AuthState) => void;
}

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [step, setStep] = useState<"email" | "verify">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      const auth: AuthState = {
        authenticated: true,
        email: data.user.email,
        name: data.user.name,
      };
      localStorage.setItem("zenith_auth", JSON.stringify(auth));
      onAuthenticated(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#F2F0EB" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="serif text-5xl font-semibold tracking-tighter mb-2" style={{ color: "#1C1C1B" }}>
            ZENITH.
          </h1>
          <p className="mono text-[11px] tracking-widest uppercase" style={{ color: "#C9A690" }}>
            Real-Time Chat
          </p>
        </div>

        <div
          className="p-8"
          style={{
            backgroundColor: "#F2F0EB",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 30px 60px -12px rgba(0,0,0,0.15)",
          }}
        >
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="mono text-[10px] text-gray-500 border-b-2 border-dashed border-gray-300 pb-3 mb-4 flex justify-between">
                <span>AUTH_PROTOCOL</span>
                <span className="px-2 py-0.5" style={{ backgroundColor: "#D4E157" }}>STEP_01</span>
              </div>

              <div>
                <label className="mono text-[11px] block mb-2 text-gray-600">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  required
                />
              </div>

              <div>
                <label className="mono text-[11px] block mb-2 text-gray-600">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  required
                />
              </div>

              {error && (
                <p className="mono text-[11px] text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mono text-xs transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#1C1C1B", color: "#F2F0EB" }}
              >
                {loading ? "SENDING..." : "SEND VERIFICATION CODE"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="mono text-[10px] text-gray-500 border-b-2 border-dashed border-gray-300 pb-3 mb-4 flex justify-between">
                <span>AUTH_PROTOCOL</span>
                <span className="px-2 py-0.5" style={{ backgroundColor: "#D4E157" }}>STEP_02</span>
              </div>

              <p className="text-sm text-gray-600">
                We sent a 6-digit code to <span className="font-medium">{email}</span>
              </p>

              <div>
                <label className="mono text-[11px] block mb-2 text-gray-600">Verification Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white border border-gray-200 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <p className="mono text-[11px] text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3 mono text-xs transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#1C1C1B", color: "#F2F0EB" }}
              >
                {loading ? "VERIFYING..." : "VERIFY & ENTER CHAT"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
                className="w-full py-2 mono text-[11px] text-gray-500 hover:text-black transition-colors"
              >
                BACK
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="mono text-[9px] text-gray-400 tracking-tighter">
            ENCRYPTED VIA TLS -- SECURE AUTH PROTOCOL
          </p>
        </div>
      </div>
    </div>
  );
}
