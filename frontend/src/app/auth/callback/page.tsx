"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const error = searchParams.get("error");

      if (error) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      if (accessToken && refreshToken) {
        // Store tokens
        Cookies.set("access_token", accessToken, { expires: 1 });
        Cookies.set("refresh_token", refreshToken, { expires: 7 });

        // Fetch user data
        await fetchUser();

        // Redirect to dashboard
        router.replace("/dashboard");
      } else {
        router.replace("/login?error=invalid_callback");
      }
    };

    handleCallback();
  }, [searchParams, router, fetchUser]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--accent)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Completing sign in...</p>
      </div>
    </div>
  );
}
