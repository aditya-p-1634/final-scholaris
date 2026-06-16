import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const resetFields = () => {
    setPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not sign in";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: username.trim() || email.split("@")[0] },
        },
      });
      if (error) throw error;

      // With email confirmation disabled, a session is returned immediately.
      if (data.session) {
        toast.success("Account created. Welcome to Scholaris.");
        navigate({ to: "/", replace: true });
        return;
      }

      // Fallback: attempt immediate sign-in (works when confirmation is off).
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError) {
        toast.success("Account created. Welcome to Scholaris.");
        navigate({ to: "/", replace: true });
        return;
      }

      toast.success("Account created. Please sign in.");
      resetFields();
      setMode("login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create account";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent. Check your inbox.");
      setMode("login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send reset link";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message);
      toast.error(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-[0_0_24px_-4px_oklch(0.72_0.16_250/0.5)]">
            <GraduationCap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">Scholaris</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Intelligence OS
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-xl p-6">
          {mode === "login" && (
            <>
              <div className="mb-5">
                <h1 className="text-lg font-semibold tracking-tight">Sign in to Scholaris</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your email and password to continue.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  placeholder="you@school.edu"
                  autoFocus
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      resetFields();
                      setMode("forgot");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Login
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  resetFields();
                  setMode("signup");
                }}
                className="w-full h-10 mt-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                Create Account
              </button>

              <Divider />

              <button
                type="button"
                onClick={google}
                disabled={loading}
                className="w-full h-10 rounded-md border border-border bg-background text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>
            </>
          )}

          {mode === "signup" && (
            <>
              <div className="mb-5">
                <h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Set up Scholaris in seconds — no email verification required.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-3">
                <Field
                  label="Username"
                  type="text"
                  value={username}
                  onChange={setUsername}
                  required
                  placeholder="your name"
                  autoFocus
                  autoComplete="username"
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  placeholder="you@school.edu"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <Field
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={loading || !email || !password || !confirmPassword}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Account
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  resetFields();
                  setMode("login");
                }}
                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            </>
          )}

          {mode === "forgot" && (
            <>
              <div className="mb-5">
                <h1 className="text-lg font-semibold tracking-tight">Reset your password</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleForgot} className="space-y-3">
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  placeholder="you@school.edu"
                  autoFocus
                  autoComplete="email"
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send reset link
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  resetFields();
                  setMode("login");
                }}
                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-5">
          Scholaris Academic Intelligence — secure by design.
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
      {message}
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  placeholder,
  autoFocus,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className="mt-1 w-full h-10 rounded-md border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 7 29.2 5 24 5 16.3 5 9.7 9.4 6.3 14.1z"/>
      <path fill="#4CAF50" d="M24 44c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2C29.1 35.6 26.7 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.7 39.6 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2 3.9-3.7 5.3l6.1 5.2C40.5 35.8 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
