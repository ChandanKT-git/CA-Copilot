import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GoogleButton } from "@/components/GoogleButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function Register() {
  const { register, googleEnabled } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created");
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
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
          <p className="label-caps">Start in minutes</p>
          <h1 className="mt-6 max-w-[16ch] text-4xl font-light leading-[1.1] tracking-tighter">
            Set up your filing workspace.
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-foreground/[0.72]">
            {["Parse Form 16, 26AS, statements", "Ask questions with cited answers", "Validate returns before filing"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-foreground" /> {t}
              </li>
            ))}
          </ul>
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
            <h2 className="text-2xl font-light tracking-tight">Create account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have one?{" "}
              <Link to="/login" className="text-foreground underline underline-offset-4" data-testid="go-login-link">
                Sign in
              </Link>
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div>
                <label className="label-caps" htmlFor="name">Full name</label>
                <input
                  id="name"
                  data-testid="register-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring"
                  placeholder="CA Ananya Rao"
                />
              </div>
              <div>
                <label className="label-caps" htmlFor="email">Email</label>
                <input
                  id="email"
                  data-testid="register-email-input"
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
                  data-testid="register-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full border border-input bg-background px-3 py-3 text-sm outline-none transition-colors duration-200 focus:border-ring"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <button
                data-testid="register-submit-button"
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 bg-foreground py-3 text-sm text-background transition-transform duration-200 active:translate-y-px disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
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
