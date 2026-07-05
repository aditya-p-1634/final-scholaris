import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  PlayCircle, Loader2, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
  Download, FlaskConical, Activity, Timer, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { DEV_MODE } from "@/lib/dev-mode";
import {
  runVerification, downloadReport, formatReport,
  type VerificationReport, type VerificationStatus, type GroupResult,
} from "@/lib/verification";

export const Route = createFileRoute("/_authenticated/_app/verification")({
  component: VerificationPage,
});

const GROUPS = [
  "Authentication", "Curriculum Import", "Knowledge Graph", "Intelligence Engines",
  "Commander Mode", "Session Mode", "Universal Capture", "Daily OS",
  "Academic Map", "Backup & Restore", "Settings", "Global Search", "Data Integrity",
];

function statusBadge(s: VerificationStatus) {
  const map = {
    pass: { c: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", l: "PASS" },
    warn: { c: "bg-amber-500/15 text-amber-500 border-amber-500/30", l: "WARN" },
    fail: { c: "bg-red-500/15 text-red-500 border-red-500/30", l: "FAIL" },
    skip: { c: "bg-muted text-muted-foreground border-border", l: "SKIP" },
  } as const;
  const m = map[s];
  return <Badge variant="outline" className={`${m.c} font-mono text-[10px]`}>{m.l}</Badge>;
}

function statusIcon(s: VerificationStatus) {
  if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "fail") return <XCircle className="h-4 w-4 text-red-500" />;
  if (s === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

function VerificationPage() {
  if (!DEV_MODE) return <Navigate to="/" />;

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);

  const runAll = async (groups?: string[]) => {
    setRunning(true);
    setProgress({ done: 0, total: 1, label: "Preparing synthetic workspace..." });
    try {
      const r = await runVerification({
        groups,
        onProgress: (p) => setProgress({ done: p.done, total: p.total, label: `${p.group} · ${p.test}` }),
      });
      setReport(r);
      if (r.deploymentStatus === "READY") toast.success(`Verification passed · ${r.overallScore}%`);
      else if (r.deploymentStatus === "READY_WITH_WARNINGS") toast.warning(`Verification finished with warnings · ${r.overallScore}%`);
      else toast.error(`Verification failed · ${r.totals.fail} failures`);
    } catch (e) {
      toast.error((e as Error).message ?? "Verification crashed");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(formatReport(report));
    toast.success("Text report copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" /> Developer Tools
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Verification Center</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Runs synthetic academic workspaces through every major workflow to catch regressions before deployment.
            Your real workspace is snapshotted and restored automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => runAll()} disabled={running} className="min-w-[220px]">
            {running
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running…</>
              : <><PlayCircle className="h-4 w-4 mr-2" />Run Full System Verification</>}
          </Button>
          {report && (
            <>
              <Button variant="outline" onClick={() => downloadReport(report)}><Download className="h-4 w-4 mr-2" />Download JSON</Button>
              <Button variant="outline" onClick={copyReport}>Copy Text Report</Button>
            </>
          )}
        </div>
      </div>

      {progress && (
        <Card className="p-4">
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium">{progress.label}</span>
            <span className="ml-auto text-muted-foreground tabular-nums">{progress.done} / {progress.total}</span>
          </div>
          <Progress className="mt-3" value={progress.total ? (progress.done / progress.total) * 100 : 0} />
        </Card>
      )}

      {report && <ReportSummary report={report} />}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Individual Groups</h2>
            <p className="text-xs text-muted-foreground">Run any single verification group in isolation.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {GROUPS.map((g) => {
            const gr = report?.groups.find((x) => x.group === g);
            return (
              <Button
                key={g}
                variant="outline"
                size="sm"
                disabled={running}
                onClick={() => runAll([g])}
                className="justify-between h-auto py-2"
              >
                <span className="text-left text-xs">{g}</span>
                {gr && statusBadge(gr.status)}
              </Button>
            );
          })}
        </div>
      </Card>

      {report && <GroupsDetail groups={report.groups} />}
      {report && <PerformanceCard report={report} />}
    </div>
  );
}

function ReportSummary({ report }: { report: VerificationReport }) {
  const deploy = report.deploymentStatus;
  const dc = deploy === "READY" ? "text-emerald-500" : deploy === "READY_WITH_WARNINGS" ? "text-amber-500" : "text-red-500";
  const dl = deploy === "READY" ? "READY" : deploy === "READY_WITH_WARNINGS" ? "READY WITH WARNINGS" : "BLOCKED";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5">
        <div className="grid md:grid-cols-4 gap-5">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Overall Score</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{report.overallScore}%</div>
            <Progress className="mt-2" value={report.overallScore} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Deployment</div>
            <div className={`mt-1 text-2xl font-semibold ${dc}`}>{dl}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.totals.fail} fail · {report.totals.warn} warn · {report.totals.pass} pass
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Duration</div>
            <div className="mt-1 text-2xl font-semibold">{(report.durationMs / 1000).toFixed(2)}s</div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.synthetic.subjects} subjects · {report.synthetic.concepts} concepts
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Warnings</div>
            <div className="mt-1 text-2xl font-semibold">
              {report.severity.critical} <span className="text-xs text-muted-foreground font-normal">critical</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {report.severity.medium} medium · {report.severity.high} high
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function GroupsDetail({ groups }: { groups: GroupResult[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {groups.map((g) => (
        <Card key={g.group} className="p-4">
          <div className="flex items-center gap-3">
            {statusIcon(g.status)}
            <h3 className="text-sm font-semibold flex-1">{g.group}</h3>
            <span className="text-[10px] font-mono text-muted-foreground">{g.durationMs}ms</span>
            {statusBadge(g.status)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {g.passed} pass · {g.warned} warn · {g.failed} fail · {g.skipped} skip
          </div>
          <Separator className="my-3" />
          <ul className="space-y-2">
            {g.tests.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-xs">
                <div className="mt-0.5">{statusIcon(t.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.name}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground text-[10px]">{t.durationMs}ms</span>
                  </div>
                  <div className="text-muted-foreground">{t.message}</div>
                  {t.detail && <div className="text-muted-foreground/70 text-[11px] mt-0.5 truncate">{t.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function PerformanceCard({ report }: { report: VerificationReport }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-tight">Performance Benchmarks</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {report.performance.metrics.map((m) => (
          <div key={m.name} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <div>
              <div className="text-xs font-medium">{m.name}</div>
              <div className="text-[10px] text-muted-foreground">budget {m.budgetMs}ms</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-mono ${m.ok ? "text-emerald-500" : "text-amber-500"}`}>{m.ms}ms</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                {m.ok ? <ShieldCheck className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                {m.ok ? "within budget" : "over budget"}
              </div>
            </div>
          </div>
        ))}
        {report.performance.metrics.length === 0 && (
          <div className="text-xs text-muted-foreground">No timings captured.</div>
        )}
      </div>
    </Card>
  );
}
