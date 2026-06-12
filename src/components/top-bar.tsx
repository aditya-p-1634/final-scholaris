import { useState } from "react";
import { Search, Moon, Sun, Command, Bell } from "lucide-react";
import { useTheme } from "./theme-provider";
import { GlobalSearch } from "./global-search";

export function TopBar() {
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

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
            <button className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            </button>
            <button
              onClick={toggle}
              className="h-9 w-9 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
