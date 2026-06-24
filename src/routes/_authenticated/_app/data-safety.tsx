import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Download, Upload, ShieldCheck, AlertTriangle, History, Database, FileJson,
  FileSpreadsheet, RotateCcw, Trash2, HardDrive, CheckCircle2, Activity, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useIntelligence } from "@/lib/intelligence";
import {
  exportJSON, exportSubjectsCSV, exportConceptsCSV, exportSessionsCSV,
  exportAssessmentsCSV, exportKnowledgeGraphJSON,
  createBackup, deleteBackup, downloadBackup, useBackups, maybeRunAutoBackup,
  parseSnapshotFile, previewRestore, applySnapshot,
  resetWorkspace, resetBehavioral,
  getAuditLog, runIntegrityChecks, getWorkspaceHealth,
  logAuditAction,
  type WorkspaceSnapshot, type RestorePreview, type BackupRecord,
} from "@/lib/data-safety";

export const Route = createFileRoute("/_authenticated/_app/data-safety")({
  component: DataSafetyPage,
});

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function DataSafetyPage() {
  useIntelligence(); // re-render when store changes
  const backups = useBackups();
  const [health, setHealth] = useState(() => getWorkspaceHealth());
  const [audit, setAudit] = useState(() => getAuditLog());
  const [restoreSnap, setRestoreSnap] = useState<WorkspaceSnapshot | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [confirmReset, setConfirmReset] = useState<null | "all" | "discipline" | "momentum" | "identity">(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { maybeRunAutoBackup(); }, []);
  const refresh = () => { setHealth(getWorkspaceHealth()); setAudit(getAuditLog()); };
  useEffect(() => { refresh(); }, [backups.length]);

  const integrity = health.integrity;
  const critical = integrity.issues.filter((i) => i.severity === "critical").length;
  const warnings = integrity.issues.filter((i) => i.severity === "warning").length;

  const onPickFile = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const text = await f.text();
      const snap = parseSnapshotFile(text);
      setRestoreSnap(snap);
      setRestorePreview(previewRestore(snap));
    } catch (err) {
      toast.error((err as Error).message || "Could not read snapshot.");
    }
  };

  const onCreateBackup = () => {
    const rec = createBackup("manual");
    logAuditAction("backup", "Manual backup created", `${rec.subjectCount} subjects · ${rec.conceptCount} concepts`);
    toast.success("Backup created");
    refresh();
  };

  const onRestoreBackup = (rec: BackupRecord) => {
    setRestoreSnap(rec.snapshot);
    setRestorePreview(previewRestore(rec.snapshot));
  };

  const confirmRestore = () => {
    if (!restoreSnap) return;
    applySnapshot(restoreSnap);
    logAuditAction("restore", "Workspace restored", `From snapshot ${fmtDate(restoreSnap.createdAt)}`);
    toast.success("Workspace restored");
    setRestoreSnap(null);
    setRestorePreview(null);
    refresh();
  };

  const doReset = () => {
    if (!confirmReset) return;
    if (confirmReset === "all") {
      resetWorkspace();
      logAuditAction("reset", "Workspace reset", "All academic data cleared");
      toast.success("Workspace reset");
    } else {
      resetBehavioral(confirmReset);
      logAuditAction("reset", `Reset ${confirmReset}`, "Behavioral metric history cleared");
      toast.success(`${confirmReset} reset`);
    }
    setConfirmReset(null);
    refresh();
  };

  return (
    <div className="space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary mb-1">
          System · Reliability
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Data Safety</h1>
        <p className="text-muted-foreground mt-1.5 max-w-2xl">
          Export, backup, restore and recover your academic workspace. Your progress is never one
          accident away from being lost.
        </p>
      </motion.div>

      {/* Health panel */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Workspace Health</div>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <HealthTile label="Integrity score" value={`${integrity.healthScore}/100`}
            tone={integrity.healthScore > 85 ? "good" : integrity.healthScore > 60 ? "warn" : "bad"} />
          <HealthTile label="Last backup"
            value={health.lastBackup ? `${health.lastBackupAgeHours}h ago` : "Never"}
            tone={!health.lastBackup ? "bad" : (health.lastBackupAgeHours ?? 0) > 72 ? "warn" : "good"} />
          <HealthTile label="Critical issues" value={String(critical)}
            tone={critical === 0 ? "good" : "bad"} />
          <HealthTile label="Warnings" value={String(warnings)}
            tone={warnings === 0 ? "good" : "warn"} />
        </div>
        {health.missingDataAlerts.length > 0 && (
          <div className="mt-5 space-y-1.5">
            {health.missingDataAlerts.map((m) => (
              <div key={m} className="flex items-center gap-2 text-sm text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" /> {m}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Export center */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Download className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Workspace Export Center</div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Download your data in machine-readable JSON or spreadsheet-friendly CSV.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <ExportButton icon={FileJson} label="Full workspace snapshot (.json)"
            description="Everything needed to fully reconstruct your workspace."
            onClick={exportJSON} />
          <ExportButton icon={FileJson} label="Knowledge graph (.json)"
            description="Concepts, subjects and relationships."
            onClick={exportKnowledgeGraphJSON} />
          <ExportButton icon={FileSpreadsheet} label="Subjects (.csv)"
            description="One row per subject with credits and weights."
            onClick={exportSubjectsCSV} />
          <ExportButton icon={FileSpreadsheet} label="Concepts (.csv)"
            description="Mastery, memory and review stats per concept."
            onClick={exportConceptsCSV} />
          <ExportButton icon={FileSpreadsheet} label="Session history (.csv)"
            description="Every study session you've logged."
            onClick={exportSessionsCSV} />
          <ExportButton icon={FileSpreadsheet} label="Assessment history (.csv)"
            description="Predicted vs actual scores per assessment."
            onClick={exportAssessmentsCSV} />
        </div>
      </Card>

      {/* Backup + Restore */}
      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">Backup Center</div>
            </div>
            <Button size="sm" onClick={onCreateBackup}>
              <Database className="h-3.5 w-3.5 mr-1.5" /> Create backup
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Local backups are stored on this device. A daily automatic snapshot runs on first visit
            each day. Up to 10 backups are kept.
          </p>
          {backups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No backups yet. Create one to safeguard your progress.
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
              {backups.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{fmtDate(b.createdAt)}</span>
                      <Badge variant={b.kind === "manual" ? "default" : "secondary"} className="text-[10px]">
                        {b.kind}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {b.subjectCount} subjects · {b.conceptCount} concepts · {b.sessionCount} sessions · {fmtBytes(b.sizeBytes)}
                      {b.note ? ` · ${b.note}` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => downloadBackup(b)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onRestoreBackup(b)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { deleteBackup(b.id); refresh(); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Restore</div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Restore from a snapshot file (.json). You'll see a full preview of what will be
            overwritten before anything changes.
          </p>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />
          <Button variant="outline" className="w-full" onClick={onPickFile}>
            <Upload className="h-3.5 w-3.5 mr-2" /> Choose snapshot file
          </Button>

          <Separator className="my-6" />

          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="h-4 w-4 text-destructive" />
            <div className="text-sm font-semibold">Reset</div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Permanent. A safety snapshot is created first.
          </p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setConfirmReset("discipline")}>
              Reset discipline history
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setConfirmReset("momentum")}>
              Reset momentum history
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setConfirmReset("identity")}>
              Reset identity history
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={() => setConfirmReset("all")}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Reset entire workspace
            </Button>
          </div>
        </Card>
      </div>

      {/* Integrity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Data Integrity</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setHealth({ ...health, integrity: runIntegrityChecks() })}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-scan
          </Button>
        </div>
        {integrity.issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            No issues detected. Your workspace looks healthy.
          </div>
        ) : (
          <div className="space-y-2">
            {integrity.issues.map((i) => (
              <div key={i.id} className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-2">
                <span className={
                  i.severity === "critical" ? "h-2 w-2 mt-1.5 rounded-full bg-destructive" :
                  i.severity === "warning" ? "h-2 w-2 mt-1.5 rounded-full bg-amber-500" :
                  "h-2 w-2 mt-1.5 rounded-full bg-muted-foreground"
                } />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{i.category}</div>
                  <div className="text-xs text-muted-foreground">{i.message}</div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">{i.severity}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Audit log */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Academic Audit Log</div>
        </div>
        {audit.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {audit.slice(0, 30).map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {e.kind}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{e.title}</div>
                  {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {fmtDate(new Date(e.timestamp).toISOString())}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Restore preview dialog */}
      <Dialog open={!!restoreSnap} onOpenChange={(o) => { if (!o) { setRestoreSnap(null); setRestorePreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore workspace?</DialogTitle>
            <DialogDescription>
              This will overwrite your current workspace. A safety snapshot of the current state
              will be saved automatically before the restore runs.
            </DialogDescription>
          </DialogHeader>
          {restorePreview && (
            <div className="rounded-lg border border-border/60 p-4 text-sm space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Snapshot from {fmtDate(restorePreview.createdAt)}
              </div>
              <PreviewRow label="Subjects" from={restorePreview.willOverwrite.subjects} to={restorePreview.subjects} />
              <PreviewRow label="Concepts" from={restorePreview.willOverwrite.concepts} to={restorePreview.concepts} />
              <PreviewRow label="Sessions" from={restorePreview.willOverwrite.sessions} to={restorePreview.sessions} />
              <PreviewRow label="Assessments" from={restorePreview.willOverwrite.assessments} to={restorePreview.assessments} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRestoreSnap(null); setRestorePreview(null); }}>
              Cancel
            </Button>
            <Button onClick={confirmRestore}>Restore now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirm dialog */}
      <Dialog open={!!confirmReset} onOpenChange={(o) => { if (!o) setConfirmReset(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmReset === "all" ? "Reset entire workspace?" : `Reset ${confirmReset} history?`}
            </DialogTitle>
            <DialogDescription>
              {confirmReset === "all"
                ? "All subjects, concepts, sessions and assessments will be cleared. A safety backup is created first."
                : "This clears the underlying history used to compute this metric. Other data is unaffected."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmReset(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doReset}>Confirm reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HealthTile({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-destructive";
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function ExportButton({
  icon: Icon, label, description, onClick,
}: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-border/60 p-4 hover:border-primary/60 hover:bg-accent/40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-primary" />
        <div className="text-sm font-medium">{label}</div>
      </div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  );
}

function PreviewRow({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">
        <span className="text-muted-foreground">{from}</span>
        <span className="mx-1.5">→</span>
        <span className="text-foreground">{to}</span>
      </span>
    </div>
  );
}

// Surface unused imports placeholder so the bundler keeps tree-shaking honest.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keep = useMemo;
