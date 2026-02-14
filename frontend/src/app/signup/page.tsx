"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const { register, isLoading, isAuthenticated, fetchUser } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      setIsChecking(false);
    };
    checkAuth();
  }, [fetchUser]);

  useEffect(() => {
    if (!isChecking && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router, isChecking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await register(email, password, name);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create account");
    }
  };

  const passwordStrength =
    password.length >= 8 ? "strong" : password.length >= 4 ? "medium" : "weak";

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-8 relative">
      {/* Back to Home Button */}
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-lg glass glass-hover text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-sm font-medium z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 mb-8 group"
        >
          <Image
            src="/logo.png"
            alt="Codexa"
            width={440}
            height={128}
            className="h-32 w-auto group-hover:scale-105 transition-transform"
          />
        </Link>

        {/* Card */}
        <div className="glass rounded-2xl p-6 md:p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-2">
            Create your account
          </h1>
          <p className="text-[var(--text-secondary)] text-center mb-8">
            Start chatting with your code in minutes
          </p>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 mb-6 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-[var(--error)] shrink-0" />
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                />
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2 animate-fade-in">
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength === "strong"
                          ? "w-full bg-[var(--success)]"
                          : passwordStrength === "medium"
                            ? "w-2/3 bg-[var(--warning)]"
                            : "w-1/3 bg-[var(--error)]"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength === "strong"
                        ? "text-[var(--success)]"
                        : passwordStrength === "medium"
                          ? "text-[var(--warning)]"
                          : "text-[var(--error)]"
                    }`}
                  >
                    {passwordStrength === "strong"
                      ? "Strong"
                      : passwordStrength === "medium"
                        ? "Medium"
                        : "Weak"}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password.length < 8}
              className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--text-muted)] text-center mb-4">
              What you get with your free account:
            </p>
            <ul className="space-y-2">
              {[
                "Single file upload",
                "25K tokens/month",
                "7-day file retention",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                >
                  <Check className="w-4 h-4 text-[var(--success)] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-[var(--text-secondary)] mt-6 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
