import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { UniversalCapture } from "@/components/universal-capture";
import { useIntelligenceActions } from "@/lib/intelligence";
import { loadProfile, loadWorkspace } from "@/lib/persistence";
import { supabase } from "@/integrations/supabase/client";
import { DEV_MODE, buildDevWorkspace } from "@/lib/dev-mode";

export const Route = createFileRoute("/_authenticated/_app")({
  component: AppGate,
});

function AppGate() {
  const navigate = useNavigate();
  const { hydrate } = useIntelligenceActions();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (DEV_MODE) {
        hydrate(buildDevWorkspace());
        if (!cancelled) setReady(true);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const profile = await loadProfile(user.id);
      if (!profile?.onboarded_at) {
        navigate({ to: "/import", replace: true });
        return;
      }
      const payload = await loadWorkspace(user.id);
      if (cancelled) return;
      hydrate(payload);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate, navigate]);

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold">
            Loading intelligence
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
      <UniversalCapture />
    </AppShell>
  );
}
