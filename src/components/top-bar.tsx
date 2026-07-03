import { useEffect, useState } from "react";
import { Search, Moon, Sun, Command, LogOut, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "./theme-provider";
import { GlobalSearch } from "./global-search";
import { supabase } from "@/integrations/supabase/client";
import { useIntelligenceActions } from "@/lib/intelligence";
import { useQueryClient } from "@tanstack/react-query";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [initials, setInitials] = useState("·");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clear } = useIntelligenceActions();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email ?? "");
      const name = (u.user_metadata?.display_name as string | undefined) ?? u.email ?? "";
      setInitials(
        name
          .split(/[\s@.]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase())
          .join("") || "·",
      );
    });
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-background/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="h-full flex items-center gap-4 px-5 lg:px-8">
          <button
            onClick={() => setSearchOpen(true)}
            className="group flex-1 max-w-xl flex items-center gap-2.5 h-9 px-3 rounded-md border border-border bg-card/40 hover:bg-card hover:border-border/80 transition-colors text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">
              Search concepts, missions, subjects…
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/80 border border-border rounded px-1.5 py-0.5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Light theme" : "Dark theme"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-chart-1 to-chart-4 text-[11px] font-semibold text-primary-foreground"
                aria-label="Account"
              >
                {initials}
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-40 w-56 rounded-md border border-border bg-popover shadow-lg p-1">
                    <div className="px-3 py-2 border-b border-border">
                      <div className="text-xs font-medium text-foreground truncate flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {email || "Signed in"}
                      </div>
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-sm"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
