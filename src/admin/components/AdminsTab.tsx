import React, { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { updateAdminCredentials } from "../lib/api";

interface AdminsTabProps {
  currentUsername: string;
  onToast: (msg: string) => void;
}

export function AdminsTab({ currentUsername, onToast }: AdminsTabProps) {
  const [username, setUsername] = useState(currentUsername);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await updateAdminCredentials(currentPassword, username.trim(), newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onToast("Admin username and password updated securely.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update credentials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Admin Credentials &amp; Security</h2>
        <p className="text-sm text-muted">
          Passwords are stored with bcrypt hashing on the server and never exposed in browser code.
        </p>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">Active Clinic Admin</div>
            <div className="text-xs text-muted">Signed in as @{currentUsername}</div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-booked/15 text-booked">
          Authenticated
        </span>
      </div>

      <form onSubmit={handleUpdate} className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Update Username or Password</h3>
        {error && (
          <div className="rounded-xl bg-missed/15 border border-missed/30 px-4 py-2.5 text-xs text-missed">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Admin Username</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Current Password *</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">New Password (min 8 chars) *</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="text-muted">Confirm New Password *</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line text-sm text-ink focus:outline-none focus:border-accent"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-primary-foreground text-xs font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          {saving ? "Updating…" : "Update Credentials"}
        </button>
      </form>
    </div>
  );
}
