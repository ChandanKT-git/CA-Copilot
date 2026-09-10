import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, formatINR } from "@/components/primitives";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { FileText, ShieldCheck, Clock, IndianRupee, Loader2 } from "lucide-react";

function Stat({ label, value, sub, icon: Icon }) {
  return (
    <div className="border-b border-r border-border p-6">
      <div className="flex items-center justify-between">
        <p className="label-caps">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="mt-4 font-mono text-3xl tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  const ink = resolvedTheme === "dark" ? "#e5e5e5" : "#0a0a0a";
  const grid = resolvedTheme === "dark" ? "#2a2a2a" : "#e5e5e5";
  const palette = resolvedTheme === "dark"
    ? ["#e5e5e5", "#8a8a8a", "#4d4d4d"]
    : ["#0a0a0a", "#8a8a8a", "#cccccc"];

  if (loading) {
    return <div className="grid min-h-[60dvh] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const first = (user?.name || "there").split(" ")[0];

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        eyebrow="Overview"
        title={`Good to see you, ${first}.`}
        description="A live snapshot of your filing workload, documents indexed and time recovered from manual work."
      />

      <div className="grid grid-cols-1 border-l border-border sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Documents" value={stats.documents} sub={`${stats.chunks} chunks indexed`} icon={FileText} />
        <Stat label="ITR validations" value={stats.itr_validations} sub={`${stats.queries} copilot queries`} icon={ShieldCheck} />
        <Stat label="Hours saved" value={stats.hours_saved} sub="vs. manual workflow" icon={Clock} />
        <Stat label="Cost saved" value={formatINR(stats.cost_saved)} sub="at ₹1,500 / hour" icon={IndianRupee} />
      </div>

      <div className="grid grid-cols-1 gap-px border-b border-l border-border bg-border lg:grid-cols-[1.4fr_1fr]">
        <div className="bg-background p-6">
          <p className="label-caps">Weekly activity</p>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly_activity} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="day" stroke={ink} tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={{ stroke: grid }} />
                <YAxis stroke={ink} tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: grid }}
                  contentStyle={{ background: resolvedTheme === "dark" ? "#0a0a0a" : "#fff", border: `1px solid ${grid}`, borderRadius: 0, fontFamily: "JetBrains Mono", fontSize: 12 }}
                />
                <Bar dataKey="actions" fill={ink} radius={0} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-background p-6">
          <p className="label-caps">Filing status</p>
          <div className="mt-6 flex h-64 items-center">
            {stats.filing_status.every((s) => s.value === 0) ? (
              <p className="w-full text-center text-sm text-muted-foreground">No validations yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.filing_status} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} stroke="none" paddingAngle={1}>
                    {stats.filing_status.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: resolvedTheme === "dark" ? "#0a0a0a" : "#fff", border: `1px solid ${grid}`, borderRadius: 0, fontFamily: "JetBrains Mono", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {stats.filing_status.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5" style={{ background: palette[i % palette.length] }} />
                <span className="text-xs text-muted-foreground">{s.name}</span>
                <span className="font-mono text-xs">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px border-b border-l border-border bg-border lg:grid-cols-2">
        <div className="bg-background p-6">
          <p className="label-caps">Document types</p>
          <div className="mt-6 space-y-4">
            {stats.doc_types.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
            {stats.doc_types.map((d) => {
              const max = Math.max(...stats.doc_types.map((x) => x.value), 1);
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{d.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{d.value}</span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-accent">
                    <div className="h-full bg-foreground/80" style={{ width: `${(d.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-background p-6">
          <p className="label-caps">Recent activity</p>
          <ul className="mt-6 divide-y divide-border">
            {stats.recent_activity.length === 0 && <li className="py-4 text-sm text-muted-foreground">No activity yet.</li>}
            {stats.recent_activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{a.action}</p>
                  <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{a.detail || a.entity}</p>
                </div>
                <span className="ml-4 shrink-0 font-mono text-[0.7rem] text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
