import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The recovery link establishes a session; confirm one exists.
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update password";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
          <div className="mb-5">
            <h1 className="text-lg font-semibold tracking-tight">Set a new password</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {ready
                ? "Choose a new password for your account."
                : "Open this page from the reset link in your email."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                New Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!ready}
                placeholder="••••••••"
                autoComplete="new-password"
                className="mt-1 w-full h-10 rounded-md border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Confirm Password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!ready}
                placeholder="••••••••"
                autoComplete="new-password"
                className="mt-1 w-full h-10 rounded-md border border-border bg-background/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              />
            </label>
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !ready || !password || !confirmPassword}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Update password
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate({ to: "/auth", replace: true })}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
