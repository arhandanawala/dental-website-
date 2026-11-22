import React, { useEffect, useState } from "react";
import { ShieldCheck, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import {
  getAuthStatus,
  loginWithPassword,
  logoutAdmin,
  setupInitialAdmin,
} from "../lib/api";

export interface AdminSessionUser {
  username: string;
}

interface AuthGateProps {
  children: (user: AdminSessionUser, onSignOut: () => Promise<void>) => React.ReactNode;
}

type GateStatus = "loading" | "setup" | "signed_out" | "authorized";

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<GateStatus>("loading");
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const info = await getAuthStatus();
        if (!active) return;
        if (info.authenticated && info.user) {
          setUser({ username: info.user });
          setStatus("authorized");
          return;
        }
        setStatus(info.configured ? "signed_out" : "setup");
      } catch {
        if (active) setStatus("signed_out");
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setAuthError("Please enter both your username and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res =
        status === "setup"
          ? await setupInitialAdmin(cleanUser, password)
          : await loginWithPassword(cleanUser, password);
      setUser({ username: res.user });
      setPassword("");
      setStatus("authorized");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await logoutAdmin();
    setUser(null);
    setPassword("");
    setStatus("signed_out");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span>Checking Smile Masters admin session…</span>
        </div>
      </div>
    );
  }

  if (status === "signed_out" || status === "setup") {
    const isSetup = status === "setup";
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-panel border border-line rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected Clinic CMS</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {isSetup ? "Create Clinic Admin Account" : "Smile Masters Admin"}
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              {isSetup
                ? "First-time setup: choose your clinic admin username and password (at least 8 characters)."
                : "Sign in with your Smile Masters administrator credentials to manage appointments, enquiries, Maya Voice AI calls, doctors, treatments, and site content."}
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-3 text-xs text-missed"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5 text-xs">
              <span className="text-muted font-medium">Username</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
            </label>

            <label className="block space-y-1.5 text-xs">
              <span className="text-muted font-medium">Password</span>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink cursor-pointer"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-primary-foreground font-semibold text-sm hover:opacity-95 transition disabled:opacity-60 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {submitting
                  ? "Signing in…"
                  : isSetup
                    ? "Create Admin Account"
                    : "Sign In to Clinic Desk"}
              </span>
            </button>
          </form>

          <div className="pt-4 border-t border-line flex items-center justify-between text-xs text-muted">
            <span>Bandra West, Mumbai</span>
            <a href="/" className="inline-flex items-center gap-1 text-accent hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to public site
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{user ? children(user, handleSignOut) : null}</>;
}
