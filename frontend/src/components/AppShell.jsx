import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  ShieldCheck,
  GitCompareArrows,
  Users,
  ScrollText,
  LogOut,
} from "lucide-react";

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/app/copilot", label: "CoPilot", icon: MessageSquareText, testid: "nav-copilot" },
  { to: "/app/documents", label: "Documents", icon: FileText, testid: "nav-documents" },
  { to: "/app/itr", label: "ITR Validation", icon: ShieldCheck, testid: "nav-itr" },
  { to: "/app/reconciliation", label: "Reconciliation", icon: GitCompareArrows, testid: "nav-reconciliation" },
  { to: "/app/clients", label: "Clients", icon: Users, testid: "nav-clients" },
  { to: "/app/audit", label: "Audit Trail", icon: ScrollText, testid: "nav-audit" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="sticky top-0 z-[100] hidden h-[100dvh] flex-col border-r border-border bg-background md:flex">
        <div className="flex items-center gap-2 border-b border-border px-6 py-5">
          <div className="h-4 w-4 bg-foreground" />
          <span className="font-mono text-sm tracking-tight">CA&nbsp;CoPilot</span>
        </div>
        <nav className="flex-1 px-3 py-6">
          <p className="label-caps px-3 pb-3">Workspace</p>
          <ul className="space-y-1">
            {NAV.map(({ to, label, icon: Icon, testid }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  data-testid={testid}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors duration-200 ${
                      isActive
                        ? "border-foreground bg-accent text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="grid h-8 w-8 place-items-center border border-border font-mono text-xs">
              {(user?.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{user?.name}</p>
              <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={doLogout}
            className="mt-1 flex w-full items-center gap-3 px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-[100dvh] flex-col">
        <header className="sticky top-0 z-[100] flex items-center justify-between border-b border-border bg-background px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="h-3.5 w-3.5 bg-foreground" />
            <span className="font-mono text-sm">CA CoPilot</span>
          </div>
          <div className="hidden md:block">
            <p className="label-caps">Chartered Accountant Console</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={doLogout}
              className="grid h-9 w-9 place-items-center border border-border text-foreground/70 transition-colors duration-200 hover:text-foreground hover:bg-accent md:hidden"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                  isActive ? "bg-foreground text-background" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
