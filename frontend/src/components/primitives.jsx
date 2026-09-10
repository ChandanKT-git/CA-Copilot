export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-6 border-b border-border px-6 py-8 md:flex-row md:items-end md:justify-between md:px-10">
      <div>
        {eyebrow && <p className="label-caps">{eyebrow}</p>}
        <h1 className="mt-3 text-3xl font-light tracking-tighter md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-[60ch] text-sm text-foreground/[0.72]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    pass: "border-[hsl(var(--success))] text-[hsl(var(--success))]",
    warn: "border-[hsl(var(--warning))] text-[hsl(var(--warning))]",
    fail: "border-destructive text-destructive",
    parsed: "border-[hsl(var(--success))] text-[hsl(var(--success))]",
    empty: "border-border text-muted-foreground",
    active: "border-[hsl(var(--success))] text-[hsl(var(--success))]",
  };
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider ${map[status] || "border-border text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border px-6 py-20 text-center">
      {Icon && <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />}
      <h3 className="mt-5 text-lg font-light tracking-tight">{title}</h3>
      {body && <p className="mt-2 max-w-[42ch] text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function formatINR(n) {
  const num = Number(n) || 0;
  return "₹ " + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
