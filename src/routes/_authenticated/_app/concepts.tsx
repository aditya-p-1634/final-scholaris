import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Atom, Filter, Search as SearchIcon } from "lucide-react";
import { PageHeader, Panel, StatusDot, MetricBar } from "@/components/widgets";
import { useIntelligence } from "@/lib/intelligence";
import type { ConceptStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/_app/concepts")({
  head: () => ({
    meta: [
      { title: "Concepts — Scholaris" },
      { name: "description", content: "Every concept in your academic graph with mastery, memory, ROI and risk." },
    ],
  }),
  component: ConceptsWorkspace,
});

const statusTone: Record<ConceptStatus, "success" | "info" | "warning" | "danger" | "default"> = {
  mastered: "success", strong: "info", developing: "default", weak: "warning", forgotten: "danger",
};

function ConceptsWorkspace() {
  const { concepts, subjects } = useIntelligence();
  const [q, setQ] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return concepts.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.topic.toLowerCase().includes(q.toLowerCase())) return false;
      if (subjectFilter !== "all" && c.subjectId !== subjectFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [concepts, q, subjectFilter, statusFilter]);

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Concepts"
        description={`${concepts.length} concepts tracked across ${subjects.length} subjects.`}
      />

      <Panel className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px] relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search concepts or topics…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <Select label="Subject" value={subjectFilter} onChange={setSubjectFilter}
            options={[{ v: "all", l: "All subjects" }, ...subjects.map((s) => ({ v: s.id, l: s.name }))]} />
          <Select label="Status" value={statusFilter} onChange={setStatusFilter}
            options={[
              { v: "all", l: "All status" },
              { v: "mastered", l: "Mastered" }, { v: "strong", l: "Strong" },
              { v: "developing", l: "Developing" }, { v: "weak", l: "Weak" }, { v: "forgotten", l: "Forgotten" },
            ]} />
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" />{filtered.length} results
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-5 py-2.5">Concept</th>
                <th className="text-left font-medium py-2.5">Status</th>
                <th className="text-right font-medium py-2.5">Mastery</th>
                <th className="text-right font-medium py-2.5">Memory</th>
                <th className="text-right font-medium py-2.5">ROI</th>
                <th className="text-right font-medium py-2.5">Risk</th>
                <th className="text-right font-medium px-5 py-2.5">Last review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-accent/20">
                  <td className="px-5 py-3">
                    <Link to="/concepts/$id" params={{ id: c.id }} className="block">
                      <div className="font-medium hover:text-primary transition-colors">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.subjectName} · {c.topic}</div>
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize">
                      <StatusDot tone={statusTone[c.status]} />{c.status}
                    </span>
                  </td>
                  <td className="py-3 text-right w-28">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-14"><MetricBar value={c.mastery} tone={c.mastery < 30 ? "danger" : c.mastery < 50 ? "warning" : "default"} /></div>
                      <span className="font-mono text-xs w-7 text-right">{c.mastery}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right tabular-nums">{c.memoryStrength}</td>
                  <td className="py-3 text-right tabular-nums text-success">{c.roi}</td>
                  <td className={`py-3 text-right tabular-nums ${c.risk > 60 ? "text-destructive" : c.risk > 40 ? "text-warning" : ""}`}>{c.risk}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground text-xs">{c.lastReviewed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Atom className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No concepts match your filters.</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2.5 rounded-md bg-background border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}
