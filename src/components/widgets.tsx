import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow, title, description, actions,
}: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, suffix, trend, icon: Icon, tone = "default",
}: {
  label: string; value: string | number; suffix?: string;
  trend?: number; icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneRing: Record<string, string> = {
    default: "from-primary/10 to-transparent",
    success: "from-success/15 to-transparent",
    warning: "from-warning/15 to-transparent",
    danger: "from-destructive/15 to-transparent",
    info: "from-info/15 to-transparent",
  };
  const toneText: Record<string, string> = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", toneRing[tone])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{label}</div>
          {Icon && <Icon className={cn("h-4 w-4", toneText[tone])} />}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
        {typeof trend === "number" && (
          <div className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-success" : "text-destructive",
          )}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% <span className="text-muted-foreground font-normal">7d</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Panel({
  title, description, action, children, className,
}: {
  title?: string; description?: string; action?: ReactNode;
  children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>}
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  );
}

export function StatusDot({ tone = "default" }: { tone?: "success" | "warning" | "danger" | "info" | "default" }) {
  const cls: Record<string, string> = {
    success: "bg-success shadow-[0_0_0_3px_oklch(0.72_0.16_155/0.18)]",
    warning: "bg-warning shadow-[0_0_0_3px_oklch(0.78_0.16_75/0.18)]",
    danger: "bg-destructive shadow-[0_0_0_3px_oklch(0.62_0.22_25/0.18)]",
    info: "bg-info shadow-[0_0_0_3px_oklch(0.72_0.14_230/0.18)]",
    default: "bg-muted-foreground",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", cls[tone])} />;
}

export function MetricBar({ value, max = 100, tone = "default" }: { value: number; max?: number; tone?: "default" | "success" | "warning" | "danger" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill: Record<string, string> = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
  };
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn("h-full rounded-full", fill[tone])}
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-12 w-12 rounded-full bg-muted grid place-items-center mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---- Explainability ----
// Renders any prediction's reasoning transparently: reason, evidence,
// confidence, contributing factors and projected impact. No black boxes.
export interface ExplanationData {
  reason: string;
  evidence: string[];
  confidence: number;
  factors: { label: string; weight: number; value: string }[];
  projectedImpact: string;
}

export function ConfidenceChip({ value }: { value: number }) {
  const tone = value >= 75 ? "text-success" : value >= 50 ? "text-info" : "text-warning";
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {value}% confidence
    </span>
  );
}

export function Explain({ data, defaultOpen = false }: { data: ExplanationData; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          <Info className="h-3 w-3" /> Why this prediction
        </span>
        <span className="flex items-center gap-2">
          <ConfidenceChip value={data.confidence} />
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          <p className="text-xs text-muted-foreground leading-relaxed">{data.reason}</p>
          {data.evidence.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Evidence</div>
              <ul className="space-y-0.5">
                {data.evidence.map((e, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-primary mt-px">·</span>{e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.factors.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Contributing factors</div>
              <div className="space-y-1">
                {data.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-32 shrink-0 truncate">{f.label}</span>
                    <div className="flex-1"><MetricBar value={Math.abs(f.weight) * 100} tone={f.weight < 0 ? "warning" : "default"} /></div>
                    <span className="text-[11px] font-mono text-muted-foreground w-16 text-right">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-md bg-primary/5 border border-primary/15 px-2.5 py-1.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">Projected impact </span>
            <span className="text-[11px] text-muted-foreground">{data.projectedImpact}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeltaPill({ value, invert = false, suffix = "" }: { value: number; invert?: boolean; suffix?: string }) {
  // invert=true means a negative value is good (e.g. risk going down).
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-medium font-mono",
      value === 0 ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
    )}>
      {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : value < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
      {value >= 0 ? "+" : ""}{value}{suffix}
    </span>
  );
}
