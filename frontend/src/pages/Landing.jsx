import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowRight, FileText, ShieldCheck, GitCompareArrows, MessageSquareText } from "lucide-react";

const FEATURES = [
  {
    k: "01",
    icon: FileText,
    title: "Document parsing",
    body: "Upload Form 16, 26AS, bank statements and ledgers. The parser extracts and indexes every line into a searchable knowledge base — PDF, CSV and Excel.",
    metric: "≈ 2 hrs saved / document",
  },
  {
    k: "02",
    icon: MessageSquareText,
    title: "RAG copilot",
    body: "Ask questions in plain language. Answers are retrieved from your own documents with inline source citations, grounded in Indian tax law.",
    metric: "Cited sources, no guesswork",
  },
  {
    k: "03",
    icon: ShieldCheck,
    title: "ITR validation",
    body: "Deterministic tax computation across old and new regimes, then an AI validation pass for regime choice, TDS mismatch and deduction limits.",
    metric: "Old vs new regime, computed",
  },
  {
    k: "04",
    icon: GitCompareArrows,
    title: "Reconciliation & audit",
    body: "Reconcile statements against books and keep an immutable audit trail of every action across the filing workflow.",
    metric: "Full audit log per action",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? "/app/dashboard" : "/register";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-border bg-background px-6 py-4 md:px-10">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-foreground" />
          <span className="font-mono text-sm tracking-tight">CA&nbsp;CoPilot</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            data-testid="landing-login-link"
            className="hidden border border-border px-4 py-2 text-sm transition-colors duration-200 hover:bg-accent sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            to={cta}
            data-testid="landing-cta-top"
            className="bg-foreground px-4 py-2 text-sm text-background transition-transform duration-200 hover:opacity-90 active:translate-y-px"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero split-screen */}
      <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 py-16 md:grid-cols-2 md:gap-16 md:px-10 md:py-24">
        <div className="flex flex-col justify-center animate-fade-up">
          <p className="label-caps">AI console for chartered accountants</p>
          <h1 className="mt-6 text-4xl font-light leading-[1.05] tracking-tighter sm:text-5xl lg:text-6xl">
            ITR filing, from
            <br />
            <span className="text-muted-foreground">three days</span> to
            <br />
            an afternoon.
          </h1>
          <p className="mt-8 max-w-[52ch] text-base leading-relaxed text-foreground/[0.72]">
            A copilot that parses your clients' documents, answers questions against them with citations,
            and validates the return before you file. Less manual work, lower cost per filing.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to={cta}
              data-testid="landing-cta-hero"
              className="group flex items-center gap-2 bg-foreground px-6 py-3 text-sm text-background transition-transform duration-200 active:translate-y-px"
            >
              Start filing faster
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="border border-border px-6 py-3 text-sm transition-colors duration-200 hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Data panel visual */}
        <div className="flex items-center animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="w-full border border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="label-caps">Filing summary · AY 2025-26</span>
              <span className="font-mono text-[0.7rem] text-muted-foreground">LIVE</span>
            </div>
            <div className="divide-y divide-border">
              {[
                ["Gross total income", "₹ 18,40,000"],
                ["Total deductions", "₹ 2,25,000"],
                ["Taxable income", "₹ 16,15,000"],
                ["Tax payable (new)", "₹ 2,04,360"],
                ["TDS credited", "₹ 2,11,000"],
              ].map(([label, val], i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-foreground/70">{label}</span>
                  <span className="font-mono text-sm">{val}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-accent px-5 py-4">
                <span className="text-sm">Refund due</span>
                <span className="font-mono text-sm">₹ 6,640</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
              {[
                ["Docs parsed", "6"],
                ["Checks passed", "11/12"],
                ["Time saved", "17.5h"],
              ].map(([l, v], i) => (
                <div key={i} className="px-4 py-4">
                  <div className="font-mono text-xl">{v}</div>
                  <div className="label-caps mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Zig-zag features */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const flip = i % 2 === 1;
            return (
              <div
                key={f.k}
                className={`grid grid-cols-1 items-center gap-8 border-b border-border py-16 md:grid-cols-2 md:gap-16 md:py-24 ${
                  flip ? "md:[direction:rtl]" : ""
                }`}
              >
                <div className="[direction:ltr]">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-muted-foreground">{f.k}</span>
                    <span className="h-px w-10 bg-border" />
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h2 className="mt-6 text-2xl font-light tracking-tight md:text-3xl">{f.title}</h2>
                  <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-foreground/[0.72]">{f.body}</p>
                  <p className="mt-6 font-mono text-sm text-muted-foreground">{f.metric}</p>
                </div>
                <div className="[direction:ltr]">
                  <div className="aspect-[4/3] w-full border border-border">
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                        <span className="label-caps">{f.title}</span>
                        <span className="font-mono text-[0.7rem] text-muted-foreground">{f.k}</span>
                      </div>
                      <div className="flex flex-1 items-end gap-2 p-6">
                        {[38, 62, 45, 80, 56, 72, 90].map((h, j) => (
                          <div
                            key={j}
                            className="flex-1 bg-foreground/80"
                            style={{ height: `${h}%`, opacity: 0.35 + j * 0.09 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-10 md:py-28">
        <div className="flex flex-col items-start justify-between gap-8 border border-border p-10 md:flex-row md:items-center md:p-14">
          <div>
            <h2 className="text-2xl font-light tracking-tight md:text-3xl">Cut the manual filing overhead.</h2>
            <p className="mt-3 max-w-[48ch] text-foreground/[0.72]">
              Create an account and process your first client return today.
            </p>
          </div>
          <Link
            to={cta}
            data-testid="landing-cta-bottom"
            className="group flex items-center gap-2 bg-foreground px-6 py-3 text-sm text-background transition-transform duration-200 active:translate-y-px"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <span className="font-mono text-[0.7rem] text-muted-foreground">CA CoPilot · RAG-powered filing assistant</span>
          <span className="font-mono text-[0.7rem] text-muted-foreground">2026</span>
        </div>
      </footer>
    </div>
  );
}
