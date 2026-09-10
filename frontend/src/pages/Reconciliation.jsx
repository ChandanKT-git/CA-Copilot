import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Empty } from "@/components/primitives";
import { toast } from "sonner";
import { GitCompareArrows, Loader2, FileText } from "lucide-react";

const SEV = {
  high: "border-destructive text-destructive",
  medium: "border-[hsl(var(--warning))] text-[hsl(var(--warning))]",
  low: "border-border text-muted-foreground",
};

export default function Reconciliation() {
  const [docs, setDocs] = useState([]);
  const [docId, setDocId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get("/documents").then((r) => {
      setDocs(r.data);
      if (r.data[0]) setDocId(r.data[0].id);
    });
  }, []);

  const run = async () => {
    if (!docId) { toast.error("Select a document"); return; }
    setLoading(true);
    setReport(null);
    try {
      const r = await api.post("/copilot/reconcile", { document_id: docId, instruction });
      setReport(r.data.report);
      toast.success("Reconciliation complete");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Reconciliation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="reconciliation-page">
      <PageHeader eyebrow="Ledger analysis" title="Reconciliation" description="Run an AI reconciliation over an uploaded statement or ledger to surface matched entries and discrepancies." />

      <div className="px-6 py-8 md:px-10">
        {docs.length === 0 ? (
          <Empty icon={FileText} title="No documents to reconcile" body="Upload a bank statement or ledger in Documents first." />
        ) : (
          <>
            <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label className="label-caps">Statement / ledger</label>
                <select data-testid="reconcile-doc-select" value={docId} onChange={(e) => setDocId(e.target.value)}
                  className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring">
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
                </select>
              </div>
              <div>
                <label className="label-caps">Instruction (optional)</label>
                <input data-testid="reconcile-instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)}
                  className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring" placeholder="e.g. reconcile against books" />
              </div>
              <button data-testid="reconcile-run-button" onClick={run} disabled={loading}
                className="flex items-center justify-center gap-2 bg-foreground px-5 py-3 text-sm text-background transition-transform duration-200 active:translate-y-px disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />} Run
              </button>
            </div>

            {report && (
              <div data-testid="reconcile-report" className="mt-10">
                <div className="grid grid-cols-2 border border-border md:grid-cols-4">
                  {[
                    ["Matched", report.matched],
                    ["Unmatched", report.unmatched],
                    ["Total debit", report.total_debit],
                    ["Total credit", report.total_credit],
                  ].map(([l, v], i) => (
                    <div key={i} className="border-b border-r border-border p-5 last:border-r-0">
                      <p className="label-caps">{l}</p>
                      <p className="mt-3 font-mono text-xl">{v ?? "—"}</p>
                    </div>
                  ))}
                </div>

                {report.summary && (
                  <div className="mt-6 border border-border p-5">
                    <p className="label-caps mb-2">Summary</p>
                    <p className="text-sm leading-relaxed text-foreground/85">{report.summary}</p>
                  </div>
                )}

                <div className="mt-6">
                  <p className="label-caps mb-4">Discrepancies</p>
                  {report.discrepancies?.length ? (
                    <div className="border border-border">
                      {report.discrepancies.map((d, i) => (
                        <div key={i} className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0">
                          <p className="text-sm text-foreground/85">{d.description}</p>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-mono text-sm">{d.amount}</span>
                            <span className={`border px-2 py-0.5 font-mono text-[0.7rem] uppercase ${SEV[d.severity] || SEV.low}`}>{d.severity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No discrepancies detected.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
