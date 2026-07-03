import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Swords, Atom, Target, Brain, TrendingUp,
  ShieldAlert, Sparkles, ClipboardCheck, GraduationCap, Lightbulb, Stethoscope, Timer, Sunrise, Network, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIntelligence } from "@/lib/intelligence";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";

const sections = [
  {
    label: "Execute",
    items: [
      { to: "/", label: "Commander Mode", icon: LayoutDashboard, exact: true },
      { to: "/today", label: "Today · Daily OS", icon: Sunrise },
      { to: "/session", label: "Session Mode", icon: Timer },
      { to: "/missions", label: "Missions", icon: Target },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/map", label: "Academic Map", icon: Network },
      { to: "/battlefield", label: "Subject Battlefield", icon: Swords },
      { to: "/concepts", label: "Concepts", icon: Atom },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/memory", label: "Memory", icon: Brain },
      { to: "/roi", label: "Knowledge ROI", icon: TrendingUp },
      { to: "/risk", label: "Risk", icon: ShieldAlert },
    ],
  },
  {
    label: "Engines",
    items: [
      { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
      { to: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/coach", label: "AI Coach", icon: Sparkles },
      { to: "/sessions", label: "Sessions & Assessments", icon: ClipboardCheck },
      { to: "/data-safety", label: "Data Safety", icon: ShieldCheck },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { subjects } = useIntelligence();
  const [displayName, setDisplayName] = useState<string>(DEV_MODE ? DEV_USER.displayName : "Signed in");
  const [email, setEmail] = useState<string>(DEV_MODE ? DEV_USER.email : "");

  useEffect(() => {
    if (DEV_MODE) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const u = data.user;
      const name = (u.user_metadata?.display_name as string | undefined)
        ?? (u.email ? u.email.split("@")[0] : "You");
      setDisplayName(name);
      setEmail(u.email ?? "");
    });
    return () => { cancelled = true; };
  }, []);

  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-dvh sticky top-0">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-[0_0_24px_-4px_oklch(0.72_0.16_250/0.5)]">
          <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">Scholaris</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Intelligence OS</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-5 space-y-6" aria-label="Primary">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-chart-1 to-chart-4 flex items-center justify-center text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">
              {subjects.length > 0
                ? `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`
                : (email || "Ready")}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
