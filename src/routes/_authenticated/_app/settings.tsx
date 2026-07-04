import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon, User, Palette, Keyboard, ShieldCheck, Download,
  Info, LogOut, ChevronRight, Sun, Moon, Command as CommandIcon, GraduationCap,
  Sunrise, Timer, Bell, Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { useIntelligence, useIntelligenceActions } from "@/lib/intelligence";
import { supabase } from "@/integrations/supabase/client";
import { DEV_MODE, DEV_USER } from "@/lib/dev-mode";
import { exportJSON, createBackup } from "@/lib/data-safety";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  component: SettingsPage,
});

const APP_VERSION = "1.0.0";
const APP_CHANNEL = "Release Candidate";

const PREF_KEY = "scholaris-preferences-v1";

type Preferences = {
  sessionDefaultMinutes: number;
  sessionAutoStartBreaks: boolean;
  commanderDenseLayout: boolean;
  dailyOsWeekStartMonday: boolean;
  notifyDailyBriefing: boolean;
  reduceMotion: boolean;
};

const DEFAULTS: Preferences = {
  sessionDefaultMinutes: 45,
  sessionAutoStartBreaks: true,
  commanderDenseLayout: false,
  dailyOsWeekStartMonday: true,
  notifyDailyBriefing: false,
  reduceMotion: false,
};

function loadPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(p: Preferences) {
  try { window.localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* noop */ }
}

const SHORTCUTS: Array<{ combo: string; label: string }> = [
  { combo: "⌘ / Ctrl + K", label: "Open Global Search" },
  { combo: "⌘ / Ctrl + J", label: "Universal Capture" },
  { combo: "⌘ / Ctrl + Enter", label: "Submit capture" },
  { combo: "Esc", label: "Close open dialogs" },
];

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "session", label: "Session Defaults", icon: Timer },
  { id: "commander", label: "Commander & Daily OS", icon: Sunrise },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data Safety", icon: ShieldCheck },
  { id: "about", label: "About", icon: Info },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
];

function SectionCard({
  id, title, description, children,
}: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="p-6 border-border/70 bg-card/60 backdrop-blur">
        <header className="mb-5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </header>
        {children}
      </Card>
    </section>
  );
}

function Row({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-t border-border/60 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { subjects, concepts } = useIntelligence();
  const { clear } = useIntelligenceActions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [profile, setProfile] = useState<{ email: string; displayName: string }>(
    () => DEV_MODE
      ? { email: DEV_USER.email, displayName: DEV_USER.displayName }
      : { email: "", displayName: "" },
  );
  const [savingName, setSavingName] = useState(false);

  useEffect(() => { setPrefs(loadPrefs()); }, []);
  useEffect(() => {
    if (DEV_MODE) return;
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const name = (u.user_metadata?.display_name as string | undefined)
        ?? (u.email ? u.email.split("@")[0] : "");
      setProfile({ email: u.email ?? "", displayName: name });
    });
  }, []);

  const patch = (p: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...p };
      savePrefs(next);
      return next;
    });
  };

  const saveDisplayName = async () => {
    if (DEV_MODE) { toast.success("Saved (dev mode)"); return; }
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: profile.displayName },
    });
    setSavingName(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    clear();
    if (!DEV_MODE) await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const doExport = () => {
    try { exportJSON(); toast.success("Workspace exported"); }
    catch (e) { toast.error((e as Error).message || "Export failed"); }
  };

  const doBackup = () => {
    try { createBackup("manual"); toast.success("Backup created"); }
    catch (e) { toast.error((e as Error).message || "Backup failed"); }
  };

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          <SettingsIcon className="h-3.5 w-3.5" />
          System Preferences
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Configure your identity, study defaults, appearance and data safety. Preferences are stored locally on this device.
        </p>
      </motion.header>

      <div className="grid grid-cols-12 gap-8">
        <nav className="hidden lg:block col-span-3 sticky top-24 self-start">
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                    <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100" />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="col-span-12 lg:col-span-9 space-y-6">
          <SectionCard
            id="profile"
            title="Profile"
            description="Your identity across the workspace."
          >
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                    placeholder="How you should be addressed"
                    className="max-w-md"
                  />
                  <Button onClick={saveDisplayName} disabled={savingName}>
                    {savingName ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="text-sm text-muted-foreground">
                  {profile.email || "—"}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="academic"
            title="Academic Snapshot"
            description="Live counts from your intelligence workspace."
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border/60 bg-background/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Subjects</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{subjects.length}</div>
              </div>
              <div className="rounded-md border border-border/60 bg-background/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Concepts</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{concepts.length}</div>
              </div>
              <div className="rounded-md border border-border/60 bg-background/40 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Version</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">v{APP_VERSION}</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Import a new curriculum or edit subjects from the <Link to="/battlefield" className="underline underline-offset-4 hover:text-foreground">Subject Battlefield</Link>.
            </div>
          </SectionCard>

          <SectionCard
            id="session"
            title="Session Defaults"
            description="Applied when launching a new Session Mode block."
          >
            <Row
              label="Default session length"
              hint="Focused study block duration in minutes."
            >
              <Input
                type="number"
                min={5}
                max={180}
                step={5}
                value={prefs.sessionDefaultMinutes}
                onChange={(e) => patch({ sessionDefaultMinutes: Math.max(5, Math.min(180, Number(e.target.value) || 45)) })}
                className="w-24"
              />
            </Row>
            <Row
              label="Auto-start breaks"
              hint="Slide into a break timer as soon as a focus block ends."
            >
              <Switch
                checked={prefs.sessionAutoStartBreaks}
                onCheckedChange={(v) => patch({ sessionAutoStartBreaks: v })}
              />
            </Row>
          </SectionCard>

          <SectionCard
            id="commander"
            title="Commander & Daily OS"
            description="Tune how the operating surface presents daily intelligence."
          >
            <Row
              label="Dense Commander layout"
              hint="Tighter spacing and denser widget grid on the home dashboard."
            >
              <Switch
                checked={prefs.commanderDenseLayout}
                onCheckedChange={(v) => patch({ commanderDenseLayout: v })}
              />
            </Row>
            <Row
              label="Week starts on Monday"
              hint="Affects Daily OS week strip and calendar strips across the app."
            >
              <Switch
                checked={prefs.dailyOsWeekStartMonday}
                onCheckedChange={(v) => patch({ dailyOsWeekStartMonday: v })}
              />
            </Row>
          </SectionCard>

          <SectionCard
            id="appearance"
            title="Appearance"
            description="Match Scholaris to your environment."
          >
            <Row label="Theme" hint="Switch between the dark and light interface.">
              <Button
                variant="outline"
                size="sm"
                onClick={toggle}
                className="gap-2"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light" : "Dark"}
              </Button>
            </Row>
            <Row
              label="Reduce motion"
              hint="Minimize non-essential transitions and animations."
            >
              <Switch
                checked={prefs.reduceMotion}
                onCheckedChange={(v) => patch({ reduceMotion: v })}
              />
            </Row>
          </SectionCard>

          <SectionCard
            id="shortcuts"
            title="Keyboard Shortcuts"
            description="Global shortcuts available anywhere in Scholaris."
          >
            <div className="divide-y divide-border/60">
              {SHORTCUTS.map((s) => (
                <div key={s.combo} className="flex items-center justify-between py-3 first:pt-0">
                  <span className="text-sm text-foreground">{s.label}</span>
                  <kbd className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground border border-border rounded px-2 py-0.5">
                    <CommandIcon className="h-3 w-3" />
                    <span>{s.combo.replace("⌘ / Ctrl + ", "")}</span>
                  </kbd>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            id="notifications"
            title="Notifications"
            description="Lightweight in-app prompts and reminders."
          >
            <Row
              label="Daily briefing"
              hint="Show a Commander briefing toast when you open Scholaris."
            >
              <Switch
                checked={prefs.notifyDailyBriefing}
                onCheckedChange={(v) => patch({ notifyDailyBriefing: v })}
              />
            </Row>
          </SectionCard>

          <SectionCard
            id="data"
            title="Data Safety"
            description="Export, backup and restore your academic workspace."
          >
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={doExport} className="gap-2">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={doBackup} className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Create backup
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/data-safety">Open Data Safety Center</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Full backup, restore, integrity checks and audit history live in the Data Safety module.
            </p>
          </SectionCard>

          <SectionCard
            id="about"
            title="About Scholaris"
            description="Release information and system identity."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Version</div>
                <div className="mt-1 text-sm font-medium">v{APP_VERSION}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Channel</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{APP_CHANNEL}</Badge>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Product</div>
                <div className="mt-1 text-sm">Scholaris — Academic Intelligence OS</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Runtime</div>
                <div className="mt-1 text-sm">TanStack Start · React 19 · Vite 7</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="danger"
            title="Danger Zone"
            description="Irreversible actions. Proceed with intent."
          >
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">Sign out of Scholaris</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    End the current session on this device. Your workspace data remains safely stored.
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <LogOut className="h-4 w-4" /> Sign out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign out?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will need to authenticate again to access your workspace.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={signOut}>Sign out</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">Reset or wipe workspace</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Full workspace reset, discipline reset and behavioral wipe live in the Data Safety Center.
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/data-safety">Open</Link>
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
