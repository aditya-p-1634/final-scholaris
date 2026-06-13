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
