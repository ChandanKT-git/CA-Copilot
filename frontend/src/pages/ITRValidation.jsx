import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, StatusPill, formatINR } from "@/components/primitives";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from "lucide-react";

const STEPS = ["Taxpayer", "Income", "Deductions", "Taxes paid"];

const INCOME_FIELDS = [
  ["salary", "Salary income"],
  ["house_property", "Income from house property"],
  ["capital_gains", "Capital gains"],
  ["business", "Business / profession"],
  ["other_sources", "Other sources"],
];
const DEDUCTION_FIELDS = [
  ["section_80c", "Section 80C (max ₹1.5L)"],
  ["section_80d", "Section 80D — medical insurance"],
  ["nps_80ccd1b", "NPS 80CCD(1B) (max ₹50k)"],
  ["home_loan_interest", "Home loan interest (max ₹2L)"],
  ["section_80g", "Section 80G — donations"],
];
const TAX_FIELDS = [
  ["tds", "TDS deducted"],
  ["advance_tax", "Advance tax paid"],
  ["self_assessment_tax", "Self-assessment tax"],
];

function Num({ label, value, onChange, testid }) {
  return (
    <div>
      <label className="label-caps">{label}</label>
      <div className="mt-2 flex items-center border border-input transition-colors duration-200 focus-within:border-ring">
        <span className="border-r border-input px-3 py-3 font-mono text-sm text-muted-foreground">₹</span>
        <input
          data-testid={testid}
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-background px-3 py-3 font-mono text-sm outline-none"
          placeholder="0"
        />
      </div>
    </div>
  );
}

const CheckIcon = ({ status }) =>
  status === "pass" ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
    : status === "warn" ? <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" strokeWidth={1.5} />
    : <XCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />;

export default function ITRValidation() {
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ taxpayer_name: "", pan: "", assessment_year: "2025-26", regime: "new" });
  const [income, setIncome] = useState({});
  const [deductions, setDeductions] = useState({});
  const [taxes, setTaxes] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = () => { api.get("/copilot/itr/validations").then((r) => setHistory(r.data)); };
  useEffect(loadHistory, []);

  const toNum = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v) || 0]));

  const validate = async () => {
    if (!meta.taxpayer_name.trim()) { toast.error("Taxpayer name is required"); setStep(0); return; }
    setLoading(true);
    try {
      const r = await api.post("/copilot/itr/validate", {
        ...meta,
        income: toNum(income),
        deductions: toNum(deductions),
        taxes: toNum(taxes),
      });
      setResult(r.data);
      loadHistory();
      toast.success("Validation complete");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setStep(0);
    setMeta({ taxpayer_name: "", pan: "", assessment_year: "2025-26", regime: "new" });
    setIncome({}); setDeductions({}); setTaxes({});
  };

  if (result) {
    const c = result.computation;
    const a = result.analysis || {};
    return (
      <div data-testid="itr-report">
        <PageHeader
          eyebrow={`AY ${result.assessment_year}`}
          title={result.taxpayer_name}
          description="Deterministic computation with an AI validation pass across regime choice, TDS and deduction limits."
          action={
            <button data-testid="itr-new-button" onClick={reset} className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm transition-colors duration-200 hover:bg-accent">
              <RotateCcw className="h-4 w-4" /> New validation
            </button>
          }
        />
        <div className="px-6 py-8 md:px-10">
          <div className="grid grid-cols-1 border border-border md:grid-cols-2">
            <div className="divide-y divide-border border-b border-border md:border-b-0 md:border-r">
              {[
                ["Gross total income", c.gross_total_income],
                ["Total deductions", c.total_deductions],
                ["Taxable income", c.taxable_income],
                [`Tax payable (${c.regime} regime)`, c.tax_computation.total_tax],
                ["Total tax paid", c.total_tax_paid],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-foreground/75">{l}</span>
                  <span className="font-mono text-sm">{formatINR(v)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-accent px-5 py-5">
                <span className="text-sm">{c.status}</span>
                <span className="font-mono text-lg">{formatINR(Math.abs(c.refund_or_payable))}</span>
              </div>
            </div>
            <div className="p-5">
              <p className="label-caps">Regime comparison</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between border border-border p-4">
                  <div>
                    <p className="text-sm capitalize">{c.regime} regime <span className="text-muted-foreground">(selected)</span></p>
                  </div>
                  <span className="font-mono text-sm">{formatINR(c.tax_computation.total_tax)}</span>
                </div>
                <div className="flex items-center justify-between border border-border p-4">
                  <p className="text-sm capitalize">{c.alternative_regime_name} regime</p>
                  <span className="font-mono text-sm">{formatINR(c.alternative_regime.total_tax)}</span>
                </div>
              </div>
              <div className="mt-4 border border-dashed border-border p-4">
                <p className="text-sm">
                  <span className="capitalize">{c.better_regime}</span> regime is optimal —
                  saves <span className="font-mono">{formatINR(c.regime_savings)}</span>.
                </p>
              </div>
            </div>
          </div>

          {a.summary && (
            <div className="mt-6 border border-border p-5">
              <p className="label-caps mb-2">AI validation summary</p>
              <p className="text-sm leading-relaxed text-foreground/85">{a.summary}</p>
            </div>
          )}

          {a.checks?.length > 0 && (
            <div className="mt-6">
              <p className="label-caps mb-4">Validation checks</p>
              <div className="border border-border">
                {a.checks.map((ck, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-border px-5 py-4 last:border-b-0">
                    <CheckIcon status={ck.status} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm">{ck.label}</p>
                        <StatusPill status={ck.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{ck.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {a.issues?.length > 0 && (
              <div className="border border-border p-5">
                <p className="label-caps mb-3">Issues flagged</p>
                <ul className="space-y-2">
                  {a.issues.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/85"><span className="text-destructive">·</span>{it}</li>
                  ))}
                </ul>
              </div>
            )}
            {a.recommendations?.length > 0 && (
              <div className="border border-border p-5">
                <p className="label-caps mb-3">Recommendations</p>
                <ul className="space-y-2">
                  {a.recommendations.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/85"><span className="text-[hsl(var(--success))]">·</span>{it}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="itr-page">
      <PageHeader eyebrow="Filing validation" title="ITR validation" description="Enter the return figures. Tax is computed deterministically for both regimes, then validated by the copilot." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="border-r border-border px-6 py-8 md:px-10">
          {/* Stepper */}
          <div className="mb-8 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2 border px-3 py-1.5 text-xs transition-colors duration-200 ${
                    i === step ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="font-mono">{i + 1}</span> {s}
                </button>
                {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
              </div>
            ))}
          </div>

          <div className="max-w-xl space-y-5">
            {step === 0 && (
              <>
                <div>
                  <label className="label-caps">Taxpayer name</label>
                  <input data-testid="itr-name-input" value={meta.taxpayer_name} onChange={(e) => setMeta({ ...meta, taxpayer_name: e.target.value })}
                    className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring" placeholder="Client name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps">PAN</label>
                    <input data-testid="itr-pan-input" value={meta.pan} onChange={(e) => setMeta({ ...meta, pan: e.target.value.toUpperCase() })}
                      className="mt-2 w-full border border-input bg-background px-3 py-3 font-mono text-sm outline-none transition-colors duration-200 focus:border-ring" placeholder="ABCDE1234F" maxLength={10} />
                  </div>
                  <div>
                    <label className="label-caps">Assessment year</label>
                    <select data-testid="itr-ay-select" value={meta.assessment_year} onChange={(e) => setMeta({ ...meta, assessment_year: e.target.value })}
                      className="mt-2 w-full border border-input bg-background px-3 py-3 font-mono text-sm outline-none transition-colors duration-200 focus:border-ring">
                      <option value="2025-26">2025-26</option>
                      <option value="2024-25">2024-25</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label-caps">Tax regime</label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {["new", "old"].map((r) => (
                      <button key={r} data-testid={`itr-regime-${r}`} onClick={() => setMeta({ ...meta, regime: r })}
                        className={`border px-4 py-3 text-sm capitalize transition-colors duration-200 ${meta.regime === r ? "border-foreground bg-accent" : "border-border text-muted-foreground hover:bg-accent/60"}`}>
                        {r} regime
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 1 && INCOME_FIELDS.map(([k, l]) => (
              <Num key={k} label={l} value={income[k] || ""} onChange={(v) => setIncome({ ...income, [k]: v })} testid={`income-${k}`} />
            ))}
            {step === 2 && DEDUCTION_FIELDS.map(([k, l]) => (
              <Num key={k} label={l} value={deductions[k] || ""} onChange={(v) => setDeductions({ ...deductions, [k]: v })} testid={`deduction-${k}`} />
            ))}
            {step === 3 && TAX_FIELDS.map(([k, l]) => (
              <Num key={k} label={l} value={taxes[k] || ""} onChange={(v) => setTaxes({ ...taxes, [k]: v })} testid={`tax-${k}`} />
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3">
            {step > 0 && (
              <button data-testid="itr-back-button" onClick={() => setStep(step - 1)} className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm transition-colors duration-200 hover:bg-accent">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button data-testid="itr-next-button" onClick={() => setStep(step + 1)} className="flex items-center gap-2 bg-foreground px-5 py-2.5 text-sm text-background transition-transform duration-200 active:translate-y-px">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button data-testid="itr-validate-button" onClick={validate} disabled={loading} className="flex items-center gap-2 bg-foreground px-5 py-2.5 text-sm text-background transition-transform duration-200 active:translate-y-px disabled:opacity-60">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Validating…</> : <><ShieldCheck className="h-4 w-4" /> Validate return</>}
              </button>
            )}
          </div>
        </div>

        {/* History */}
        <aside className="px-6 py-8">
          <p className="label-caps mb-4">Recent validations</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {history.slice(0, 12).map((h) => (
                <li key={h.id}>
                  <button data-testid={`itr-history-${h.id}`} onClick={() => setResult(h)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-accent">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{h.taxpayer_name}</p>
                      <p className="font-mono text-[0.7rem] text-muted-foreground">AY {h.assessment_year}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs">{formatINR(Math.abs(h.computation?.refund_or_payable || 0))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
