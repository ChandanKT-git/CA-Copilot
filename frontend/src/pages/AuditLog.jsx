import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Empty } from "@/components/primitives";
import { ScrollText, Loader2 } from "lucide-react";

const ACTION_LABEL = {
  "user.register": "Account created",
  "user.login": "Signed in",
  "document.upload": "Document uploaded",
  "document.delete": "Document deleted",
  "copilot.query": "CoPilot query",
  "itr.validate": "ITR validated",
  "reconcile.run": "Reconciliation run",
  "client.create": "Client added",
  "client.message": "Client message queued",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit").then((r) => setLogs(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="audit-page">
      <PageHeader eyebrow="Compliance" title="Audit trail" description="An immutable, timestamped log of every action across your filing workflow." />

      <div className="px-6 py-8 md:px-10">
        {loading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <Empty icon={ScrollText} title="No audit events yet" body="Actions like uploads, queries and validations will appear here." />
        ) : (
          <div className="border border-border">
            <div className="hidden grid-cols-[180px_1fr_140px] items-center gap-4 border-b border-border bg-accent/40 px-4 py-3 md:grid">
              {["Timestamp", "Action", "Entity"].map((h) => <span key={h} className="label-caps">{h}</span>)}
            </div>
            {logs.map((l) => (
              <div key={l.id} data-testid={`audit-row-${l.id}`} className="grid grid-cols-1 gap-1 border-b border-border px-4 py-3.5 last:border-b-0 md:grid-cols-[180px_1fr_140px] md:items-center md:gap-4">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <div className="min-w-0">
                  <span className="text-sm">{ACTION_LABEL[l.action] || l.action}</span>
                  {l.detail && <span className="ml-2 truncate font-mono text-[0.7rem] text-muted-foreground">— {l.detail}</span>}
                </div>
                <span className="font-mono text-xs text-muted-foreground">{l.entity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
