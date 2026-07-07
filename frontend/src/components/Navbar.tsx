"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ];

  const isLandingPage = pathname === "/";

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled || !isLandingPage || isMobileMenuOpen
          ? "bg-[rgba(255,255,255,0.03)] backdrop-blur-[24px] shadow-lg border-b border-[var(--border)]"
          : "bg-transparent border-b border-transparent",
      )}
      style={{
        backdropFilter:
          isScrolled || !isLandingPage || isMobileMenuOpen
            ? "blur(24px) saturate(180%)"
            : "none",
        WebkitBackdropFilter:
          isScrolled || !isLandingPage || isMobileMenuOpen
            ? "blur(24px) saturate(180%)"
            : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="Codexa"
              width={260}
              height={72}
              className="h-18 w-auto group-hover:scale-105 transition-transform mb-3"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {isLandingPage &&
              navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
          </div>

          {/* Auth Buttons & Controls */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.picture && (
                  <Image
                    src={user.picture}
                    alt={user.name || user.email}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all text-sm font-medium"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-all text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all text-sm font-medium shadow-lg shadow-[var(--accent)]/20"
              >
                Sign in with Google
              </Link>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-[var(--text-primary)]" />
              ) : (
                <Menu className="w-6 h-6 text-[var(--text-primary)]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border)] animate-fade-in">
            <div className="flex flex-col gap-2">
              {isLandingPage &&
                navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all text-sm font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              {isLandingPage && (isAuthenticated || navLinks.length > 0) && (
                <div className="h-px bg-[var(--border)] my-2" />
              )}
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all text-sm font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-4 py-2.5 rounded-lg text-left text-[var(--error)] hover:bg-[var(--error)]/10 transition-all text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-center hover:bg-[var(--accent-hover)] transition-all text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in with Google
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
