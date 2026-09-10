import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GoogleButton } from "@/components/GoogleButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const { login, googleEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground md:grid md:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border p-12 md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-4 w-4 bg-foreground" />
          <span className="font-mono text-sm tracking-tight">CA CoPilot</span>
        </Link>
        <div>
          <p className="label-caps">Chartered Accountant console</p>
          <h1 className="mt-6 max-w-[16ch] text-4xl font-light leading-[1.1] tracking-tighter">
            Sign in to your filing workspace.
          </h1>
          <p className="mt-6 max-w-[44ch] text-foreground/[0.72]">
            Parsed documents, RAG answers and validated returns — all in one place.
          </p>
        </div>
        <span className="font-mono text-[0.7rem] text-muted-foreground">2026 · RAG-powered</span>
      </div>

      <div className="flex min-h-[100dvh] flex-col px-6 py-6 md:px-0">
        <div className="flex items-center justify-between md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-4 w-4 bg-foreground" />
            <span className="font-mono text-sm">CA CoPilot</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-8 hidden justify-end md:flex">
              <ThemeToggle />
            </div>
            <h2 className="text-2xl font-light tracking-tight">Sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              New here?{" "}
              <Link to="/register" className="text-foreground underline underline-offset-4" data-testid="go-register-link">
                Create an account
              </Link>
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div>
                <label className="label-caps" htmlFor="email">Email</label>
                <input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring"
                  placeholder="you@firm.in"
                />
              </div>
              <div>
                <label className="label-caps" htmlFor="password">Password</label>
                <input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring"
                  placeholder="••••••••"
                />
              </div>
              <button
                data-testid="login-submit-button"
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 bg-foreground py-3 text-sm text-background transition-transform duration-200 active:translate-y-px disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            {googleEnabled && (
              <>
                <div className="my-6 flex items-center gap-4">
                  <span className="h-px flex-1 bg-border" />
                  <span className="label-caps">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <GoogleButton />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
