"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Zap,
  Loader2,
  AlertCircle,
  CreditCard,
  Crown,
} from "lucide-react";
import { billingApi, chatApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface Plan {
  tier: string;
  name: string;
  price_inr: number;
  price_usd: number;
  popular?: boolean;
  features: string[];
  limits: {
    projects: number;
    tokens: number;
    max_files?: number;
    max_file_lines?: number;
    max_size_mb?: number;
  };
}

interface Subscription {
  id: string;
  tier: string;
  status: string;
  amount: number;
  currency: string;
  next_billing_date: string | null;
}

interface Usage {
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  tier: string;
  projects_used: number;
  projects_limit: number;
  reset_date: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricingRes, usageRes] = await Promise.all([
          billingApi.getPricing(),
          chatApi.getUsage(),
        ]);

        // Map tiers to plans with proper structure
        const mappedPlans = pricingRes.data.tiers.map((tier: any) => ({
          tier: tier.id,
          name: tier.name,
          price_inr: tier.price_inr,
          price_usd: tier.price_usd,
          popular: tier.id === "pro",
          features: tier.features,
          limits: {
            projects: tier.projects,
            tokens: tier.tokens,
          },
        }));

        setPlans(mappedPlans);
        setUsage(usageRes.data);

        try {
          const subRes = await billingApi.getSubscription();
          setSubscription(subRes.data);
        } catch {
          // No subscription found, that's okay
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async (tier: string) => {
    if (tier === "free") return;

    setIsProcessing(true);
    try {
      const response = await billingApi.checkout(tier, "INR");
      // Redirect to Gumroad checkout
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to initiate checkout");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.",
      )
    )
      return;

    setIsProcessing(true);
    try {
      await billingApi.cancel();
      setSubscription((prev) =>
        prev ? { ...prev, status: "cancelled" } : null,
      );
      alert("Subscription cancelled successfully");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to cancel subscription");
    } finally {
      setIsProcessing(false);
    }
  };

  const tokenPercentage = usage
    ? (usage.tokens_used / usage.tokens_limit) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Billing & Subscription
        </h1>
        <p className="text-[var(--text-secondary)]">
          Manage your plan and usage
        </p>
      </div>

      {/* Current Usage */}
      {usage && (
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">
                Current Usage
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Resets on{" "}
                {new Date(usage.reset_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">
                  Tokens Used
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {formatNumber(usage.tokens_used)} /{" "}
                  {formatNumber(usage.tokens_limit)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    tokenPercentage > 90
                      ? "bg-[var(--error)]"
                      : tokenPercentage > 70
                        ? "bg-[var(--warning)]"
                        : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">
                  Projects
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {usage.projects_used} /{" "}
                  {usage.projects_limit === 0
                    ? "Files only"
                    : usage.projects_limit}
                </span>
              </div>
              <div className="h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{
                    width:
                      usage.projects_limit > 0
                        ? `${
                            (usage.projects_used / usage.projects_limit) * 100
                          }%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      {subscription &&
        subscription.status === "active" &&
        subscription.tier !== "free" && (
          <div className="glass rounded-2xl p-6 mb-8 border border-[var(--accent)]/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)]">
                    {subscription.tier === "pro_plus"
                      ? "Pro+"
                      : subscription.tier.charAt(0).toUpperCase() +
                        subscription.tier.slice(1)}{" "}
                    Plan
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    ₹
                    {plans.find((p) => p.tier === subscription.tier)
                      ?.price_inr || subscription.amount}
                    /month
                    {subscription.next_billing_date && (
                      <>
                        {" "}
                        • Next billing:{" "}
                        {new Date(
                          subscription.next_billing_date,
                        ).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors text-sm"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = usage?.tier === plan.tier;
          const price = plan.price_inr;

          // Define tier hierarchy
          const tierOrder = { free: 0, basic: 1, pro: 2, pro_plus: 3 };
          const currentTierLevel =
            tierOrder[usage?.tier as keyof typeof tierOrder] || 0;
          const planTierLevel =
            tierOrder[plan.tier as keyof typeof tierOrder] || 0;
          const isLowerTier = planTierLevel < currentTierLevel;

          return (
            <div
              key={plan.tier}
              className={`rounded-2xl p-6 relative flex flex-col ${
                plan.popular && !isLowerTier && !isCurrentPlan
                  ? "bg-[var(--accent)] text-white"
                  : "glass"
              } ${isCurrentPlan ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              {plan.popular && !isLowerTier && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--warning)] text-black text-xs font-medium">
                  Most Popular
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-[var(--success)] text-white text-xs font-medium">
                  Current Plan
                </div>
              )}

              <h3
                className={`text-xl font-semibold mb-2 ${
                  plan.popular && !isLowerTier && !isCurrentPlan
                    ? "text-white"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {plan.name}
              </h3>

              <div className="mb-6">
                <span
                  className={`text-4xl font-bold ${
                    plan.popular && !isLowerTier && !isCurrentPlan
                      ? "text-white"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  ₹{price}
                </span>
                <span
                  className={`text-sm ${
                    plan.popular && !isLowerTier && !isCurrentPlan
                      ? "text-white/80"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  /month
                </span>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.popular && !isLowerTier && !isCurrentPlan
                          ? "text-white"
                          : "text-[var(--success)]"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.popular && !isLowerTier && !isCurrentPlan
                          ? "text-white/90"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.tier)}
                disabled={
                  isProcessing ||
                  isCurrentPlan ||
                  plan.tier === "free" ||
                  isLowerTier
                }
                className={`w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular && !isLowerTier && !isCurrentPlan
                    ? "bg-white text-[var(--accent)] hover:bg-white/90"
                    : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                }`}
              >
                {isCurrentPlan
                  ? "Current Plan"
                  : isLowerTier
                    ? "Lower Tier"
                    : plan.tier === "free"
                      ? "Free Forever"
                      : isProcessing
                        ? "Processing..."
                        : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          {[
            {
              q: "Can I change my plan later?",
              a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
            },
            {
              q: "What happens to my projects if I downgrade?",
              a: "Your existing projects remain accessible, but you won't be able to create new ones if you exceed the new limit.",
            },
            {
              q: "Is there a refund policy?",
              a: "We offer a 7-day money-back guarantee for all paid plans. Contact us if you're not satisfied.",
            },
          ].map((faq, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <h4 className="font-medium text-[var(--text-primary)] mb-1">
                {faq.q}
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
