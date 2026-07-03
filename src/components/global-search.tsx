import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Atom, Swords, Target, LayoutDashboard, Brain, TrendingUp, ShieldAlert, Sparkles, Sunrise, Timer, Network, Lightbulb, Stethoscope, ClipboardCheck, ShieldCheck } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { useIntelligence } from "@/lib/intelligence";

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  // Read from the live persisted workspace — never demo data.
  const { subjects, concepts, missions } = useIntelligence();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate({ to: path });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search concepts, subjects, missions, dashboards…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/")}><LayoutDashboard className="mr-2 h-4 w-4" />Command Center</CommandItem>
          <CommandItem onSelect={() => go("/battlefield")}><Swords className="mr-2 h-4 w-4" />Subject Battlefield</CommandItem>
          <CommandItem onSelect={() => go("/concepts")}><Atom className="mr-2 h-4 w-4" />Concepts</CommandItem>
          <CommandItem onSelect={() => go("/missions")}><Target className="mr-2 h-4 w-4" />Missions Center</CommandItem>
          <CommandItem onSelect={() => go("/memory")}><Brain className="mr-2 h-4 w-4" />Memory Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/roi")}><TrendingUp className="mr-2 h-4 w-4" />ROI Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/risk")}><ShieldAlert className="mr-2 h-4 w-4" />Risk Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/coach")}><Sparkles className="mr-2 h-4 w-4" />AI Coach</CommandItem>
        </CommandGroup>
        {subjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Subjects">
              {subjects.map((s) => (
                <CommandItem key={s.id} onSelect={() => go(`/subjects/${s.id}`)}>
                  <Swords className="mr-2 h-4 w-4" />
                  <span>{s.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {concepts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Concepts">
              {concepts.slice(0, 8).map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`/concepts/${c.id}`)}>
                  <Atom className="mr-2 h-4 w-4" />
                  <span>{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{c.subjectName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {missions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Missions">
              {missions.slice(0, 5).map((m) => (
                <CommandItem key={m.id} onSelect={() => go("/missions")}>
                  <Target className="mr-2 h-4 w-4" />
                  <span>{m.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{m.priority}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
