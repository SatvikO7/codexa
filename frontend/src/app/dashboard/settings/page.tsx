"use client";

import { useState } from "react";
import { User, Mail, Lock, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    // In a real app, you'd call an API here
    setTimeout(() => {
      setIsSaving(false);
      setMessage("Settings saved successfully");
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-[var(--text-secondary)]">
          Manage your account settings
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 mb-6">
          <Check className="w-5 h-5 text-[var(--success)]" />
          <p className="text-sm text-[var(--success)]">{message}</p>
        </div>
      )}

      {/* Profile Section */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
          Profile
        </h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Email cannot be changed
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>

      {/* Security Section */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
          Security
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Password
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Last changed: Never
                </p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors text-sm">
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass rounded-2xl p-6 border border-[var(--error)]/30">
        <h2 className="text-lg font-semibold text-[var(--error)] mb-4">
          Danger Zone
        </h2>

        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--error)]/5">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Delete Account
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Permanently delete your account and all data
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-[var(--error)] text-white hover:bg-[var(--error)]/90 transition-colors text-sm">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
