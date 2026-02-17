import Link from "next/link";
import {
  Upload,
  MessageSquare,
  Lock,
  Zap,
  Code2,
  FileCode,
  Shield,
  Clock,
  Check,
  ChevronDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 md:mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"></span>
            <span className="text-sm text-[var(--text-secondary)]">
              Now in public beta
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 md:mb-6 animate-fade-in">
            <span className="text-[var(--text-primary)]">Chat with your</span>
            <br />
            <span className="gradient-text">codebase.</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 md:mb-10 max-w-2xl mx-auto animate-fade-in px-4">
            Upload your project. Ask questions. Understand your code instantly.
            Powered by AI that actually gets your code.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4 animate-fade-in">
            <Link
              href="/login"
              className="px-6 md:px-8 py-3 md:py-4 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-all hover:scale-105 animate-pulse-glow shadow-lg shadow-[var(--accent)]/30"
            >
              Start for Free
            </Link>
            <a
              href="#features"
              className="px-6 md:px-8 py-3 md:py-4 rounded-xl glass glass-hover text-[var(--text-primary)] font-medium transition-all cursor-pointer"
            >
              See how it works
            </a>
          </div>

          {/* Demo Preview */}
          <div className="mt-12 md:mt-16 relative animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto"></div>
            <div className="glass rounded-xl md:rounded-2xl p-3 md:p-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-[var(--error)]"></div>
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-[var(--warning)]"></div>
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-[var(--success)]"></div>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-lg md:rounded-xl p-3 md:p-6 text-left">
                <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3.5 md:w-4 h-3.5 md:h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-1">
                      You
                    </p>
                    <p className="text-[var(--text-primary)] text-sm md:text-base">
                      What does the authentication middleware do?
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                    <Code2 className="w-3.5 md:w-4 h-3.5 md:h-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-1">
                      Codexa AI
                    </p>
                    <p className="text-[var(--text-primary)] mb-2 md:mb-3 text-sm md:text-base">
                      The auth middleware in{" "}
                      <code className="px-1.5 md:px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--accent)] text-xs md:text-sm border border-[var(--border)]">
                        src/middleware/auth.py
                      </code>{" "}
                      handles JWT token validation...
                    </p>
                    <pre className="bg-[var(--bg-surface)] rounded-lg p-3 md:p-4 text-xs md:text-sm overflow-x-auto border border-[var(--border)]">
                      <code className="text-[var(--text-secondary)]">{`def verify_token(token: str):
    payload = jwt.decode(token, SECRET_KEY)
    return payload.get("user_id")`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Everything you need to understand your code
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto px-4">
              Upload once, ask unlimited questions. Our AI understands context,
              relationships, and patterns in your codebase.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                icon: Upload,
                title: "Easy Upload",
                description:
                  "Upload your project as a zip file. We automatically filter out node_modules and other unnecessary files.",
              },
              {
                icon: MessageSquare,
                title: "Natural Conversations",
                description:
                  "Ask questions in plain English. Get detailed explanations with relevant code snippets.",
              },
              {
                icon: FileCode,
                title: "Smart Indexing",
                description:
                  "We index your entire codebase for instant, accurate answers about any file or function.",
              },
              {
                icon: Lock,
                title: "Secure & Private",
                description:
                  "Your code is encrypted and never used for training. Delete anytime.",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Get answers in seconds, not minutes. Our RAG pipeline is optimized for speed.",
              },
              {
                icon: Clock,
                title: "Persistent History",
                description:
                  "Your chat history is saved. Pick up where you left off anytime.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="glass glass-hover rounded-xl md:rounded-2xl p-5 md:p-6 cursor-pointer transition-all hover:scale-[1.02] animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-11 md:w-12 h-11 md:h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 md:w-6 h-5 md:h-6 text-[var(--accent)]" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-[var(--text-secondary)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Start free. Upgrade when you need more. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Free",
                price: 0,
                features: [
                  "Single file upload",
                  "25K tokens/month",
                  "7-day retention",
                  "Basic support",
                ],
                cta: "Get Started",
                popular: false,
              },
              {
                name: "Basic",
                price: 249,
                features: [
                  "1 project",
                  "150K tokens/month",
                  "Up to 200 files",
                  "Permanent storage",
                  "Email support",
                ],
                cta: "Subscribe",
                popular: false,
              },
              {
                name: "Pro",
                price: 749,
                features: [
                  "5 projects",
                  "500K tokens/month",
                  "Up to 500 files",
                  "Permanent storage",
                  "Priority support",
                ],
                cta: "Subscribe",
                popular: true,
              },
              {
                name: "Pro+",
                price: 1999,
                features: [
                  "15 projects",
                  "2M tokens/month",
                  "Up to 2000 files",
                  "Permanent storage",
                  "Priority support",
                  "API access (soon)",
                ],
                cta: "Subscribe",
                popular: false,
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl p-6 relative flex flex-col ${
                  plan.popular ? "bg-[var(--accent)] text-white" : "glass"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--warning)] text-black text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <h3
                  className={`text-xl font-semibold mb-2 ${
                    plan.popular ? "text-white" : "text-[var(--text-primary)]"
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span
                    className={`text-4xl font-bold ${
                      plan.popular ? "text-white" : "text-[var(--text-primary)]"
                    }`}
                  >
                    ₹{plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.popular
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
                          plan.popular ? "text-white" : "text-[var(--success)]"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          plan.popular
                            ? "text-white/90"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full py-3 rounded-xl text-center font-medium transition-all ${
                    plan.popular
                      ? "bg-white text-[var(--accent)] hover:bg-white/90"
                      : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What file formats are supported?",
                a: "We support all major programming languages including Python, JavaScript, TypeScript, Java, Go, Rust, C/C++, and many more. Upload your project as a .zip file.",
              },
              {
                q: "Is my code secure?",
                a: "Absolutely. Your code is encrypted in transit and at rest. We never use your code for training AI models. You can delete your projects at any time.",
              },
              {
                q: "What are tokens?",
                a: "Tokens are how we measure usage. Roughly, 1 token = 4 characters. Your monthly limit includes both your questions and AI responses.",
              },
              {
                q: "Can I use this for work/commercial projects?",
                a: "Yes! All our plans, including free, can be used for commercial projects. Your code remains yours.",
              },
              {
                q: "What happens when I hit my token limit?",
                a: "You can upgrade your plan anytime, or wait until your limit resets at the start of your next billing cycle.",
              },
            ].map((faq, index) => (
              <details key={index} className="glass rounded-xl group">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="text-[var(--text-primary)] font-medium">
                    {faq.q}
                  </span>
                  <ChevronDown className="w-5 h-5 text-[var(--text-secondary)] group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-[var(--text-secondary)]">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Ready to chat with your code?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
              Join thousands of developers who understand their codebases better
              with Codexa.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 rounded-xl bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-all hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-[var(--text-primary)]">
                Codexa
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-sm">
              © 2024 Codexa. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
