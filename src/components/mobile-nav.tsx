import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Swords, Atom, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/battlefield", label: "Subjects", icon: Swords },
  { to: "/concepts", label: "Concepts", icon: Atom },
  { to: "/missions", label: "Missions", icon: Target },
  { to: "/coach", label: "Coach", icon: Sparkles },
];

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
