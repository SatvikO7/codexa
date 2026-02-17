"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_failed") {
      setError("Failed to sign in with Google. Please try again.");
    } else if (errorParam === "invalid_callback") {
      setError("Invalid authentication callback. Please try again.");
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    window.location.href = `${apiUrl}/auth/google/login`;
  };

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
            Welcome back
          </h1>
          <p className="text-[var(--text-secondary)] text-center mb-8">
            Sign in to continue to your dashboard
          </p>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 mb-6 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-[var(--error)] shrink-0" />
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-xl bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl border border-gray-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-[var(--text-muted)] mt-6 text-xs">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
