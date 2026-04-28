"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requestNotificationPermission, saveFCMToken, disableNotifications } from "@/lib/notifications";
import { getUserStacks } from "@/lib/firestore/stacks";
import { getPendingAlerts } from "@/lib/firestore/alerts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Mail, Zap, Trash2, Download, Loader2, CheckCircle2,
  AlertTriangle, Link2, Radio, Settings2, Moon
} from "lucide-react";

interface UserSettings {
  emailDigest: boolean;
  digestFrequency: "weekly" | "daily";
  notificationsEnabled: boolean;
  autoAnalysis: boolean;
  relevanceThreshold: number;
  slackEnabled: boolean;
  slackWebhook: string;
  slackAlertLevel: "critical" | "high" | "all";
}

const DEFAULT_SETTINGS: UserSettings = {
  emailDigest: true,
  digestFrequency: "weekly",
  notificationsEnabled: false,
  autoAnalysis: true,
  relevanceThreshold: 60,
  slackEnabled: false,
  slackWebhook: "",
  slackAlertLevel: "high",
};

function Toggle({ checked, onToggle, disabled = false }: { checked: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 ${checked ? "bg-blue-600" : "bg-gray-600"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [slackWebhookInput, setSlackWebhookInput] = useState("");
  const [slackStatus, setSlackStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [slackError, setSlackError] = useState("");
  const [digestStatus, setDigestStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [pushStatus, setPushStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [clearing, setClearing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/"); return; }
    loadSettings();
  }, [user, authLoading, router]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        const s = data.settings || {};
        setSettings({ ...DEFAULT_SETTINGS, ...s });
        setSlackWebhookInput(s.slackWebhook || "");
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  };

  const saveSettings = async (updated: UserSettings) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { settings: updated });
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(null), 2000);
    } catch {
      setSaveMsg("Saved locally");
      setTimeout(() => setSaveMsg(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const update = (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const testSlackConnection = async () => {
    if (!slackWebhookInput.trim()) { setSlackError("Enter a webhook URL first"); return; }
    setSlackStatus("testing");
    setSlackError("");
    try {
      const res = await fetch("/api/slack-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: slackWebhookInput }),
      });
      const data = await res.json();
      if (data.success) {
        setSlackStatus("ok");
        update({ slackWebhook: slackWebhookInput, slackEnabled: true });
      } else {
        setSlackStatus("error");
        setSlackError(data.error || "Connection failed");
      }
    } catch (e: any) {
      setSlackStatus("error");
      setSlackError(e.message);
    }
  };

  const sendTestDigest = async () => {
    if (!user) return;
    setDigestStatus("sending");
    try {
      const [stacks, alerts] = await Promise.all([
        getUserStacks(user.uid).catch(() => []),
        getPendingAlerts(user.uid).catch(() => []),
      ]);
      const stats = {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a: any) => a.urgency === "critical").length,
        potentialSavings: Math.abs(Math.min(0, alerts.reduce((s: number, a: any) => s + (a.costImpact || 0), 0))),
        actedOn: 0,
      };
      const res = await fetch("/api/send-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          userName: user.displayName || "there",
          alerts,
          stats,
          dashboardUrl: window.location.origin + "/dashboard",
        }),
      });
      const data = await res.json();
      setDigestStatus(data.success ? "ok" : "error");
    } catch {
      setDigestStatus("error");
    }
    setTimeout(() => setDigestStatus("idle"), 3000);
  };

  const enablePushNotifications = async () => {
    if (!user) return;
    setPushStatus("requesting");
    try {
      const token = await requestNotificationPermission();
      if (token) {
        await saveFCMToken(user.uid, token);
        setPushStatus("granted");
        update({ notificationsEnabled: true });
        setNotifPermission("granted");
      } else {
        setPushStatus("denied");
        setNotifPermission("denied");
      }
    } catch {
      setPushStatus("denied");
    }
  };

  const disablePush = async () => {
    if (!user) return;
    await disableNotifications(user.uid).catch(console.error);
    update({ notificationsEnabled: false });
  };

  const clearAllData = async () => {
    if (!user || !confirm("Delete ALL your stacks, alerts, and scenarios? This cannot be undone.")) return;
    setClearing(true);
    try {
      const { collection, getDocs, deleteDoc } = await import("firebase/firestore");
      for (const col of ["stacks", "alerts", "scenarios"]) {
        const snap = await getDocs(collection(db, "users", user.uid, col));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      }
    } catch (e) {
      console.error("Clear error:", e);
    }
    localStorage.removeItem("stack-sentinel:stack");
    localStorage.removeItem("stack-sentinel:alerts");
    setClearing(false);
    router.push("/");
  };

  if (authLoading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your preferences and integrations</p>
        </div>
        <div className="flex items-center gap-2 h-8">
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {saveMsg && <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">{saveMsg}</Badge>}
        </div>
      </div>

      {/* ── Email Digest ── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Mail size={18} /></div>
            <div>
              <CardTitle className="text-base">Email Digest</CardTitle>
              <CardDescription>Receive a summary of stack intelligence in your inbox</CardDescription>
            </div>
            <div className="ml-auto"><Toggle checked={settings.emailDigest} onToggle={() => update({ emailDigest: !settings.emailDigest })} /></div>
          </div>
        </CardHeader>
        {settings.emailDigest && (
          <CardContent className="space-y-4 pt-0">
            <div>
              <p className="text-sm font-medium mb-2">Frequency</p>
              <div className="flex gap-3">
                {(["weekly", "daily"] as const).map(f => (
                  <label key={f} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${settings.digestFrequency === f ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground hover:border-border"}`}>
                    <input type="radio" className="sr-only" checked={settings.digestFrequency === f} onChange={() => update({ digestFrequency: f })} />
                    {f === "weekly" ? "Weekly (Mondays)" : "Daily"}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={sendTestDigest} disabled={digestStatus === "sending"}>
                {digestStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : digestStatus === "ok" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Mail className="w-4 h-4" />}
                {digestStatus === "sending" ? "Sending..." : digestStatus === "ok" ? "Sent!" : "Send Test Digest"}
              </Button>
              <p className="text-xs text-muted-foreground">Sends to: {user.email}</p>
              {digestStatus === "error" && <p className="text-xs text-red-400">Failed — check EMAIL_USER/PASS in .env.local</p>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Push Notifications ── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Bell size={18} /></div>
            <div>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription>Browser alerts for critical stack changes only</CardDescription>
            </div>
            <div className="ml-auto">
              <Toggle checked={settings.notificationsEnabled} onToggle={() => settings.notificationsEnabled ? disablePush() : enablePushNotifications()} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {notifPermission === "granted" && settings.notificationsEnabled ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 size={14} /><span>Browser notifications enabled — you&apos;ll be alerted on critical events</span>
            </div>
          ) : notifPermission === "denied" ? (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle size={14} /><span>Notifications blocked by browser. Reset in browser site settings.</span>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="gap-2" onClick={enablePushNotifications} disabled={pushStatus === "requesting"}>
              {pushStatus === "requesting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {pushStatus === "requesting" ? "Requesting..." : "Enable Browser Notifications"}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Only fires for <span className="text-red-400 font-medium">critical</span> urgency alerts (pricing changes, deprecations, breaking changes).</p>
        </CardContent>
      </Card>

      {/* ── Automatic Analysis ── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Zap size={18} /></div>
            <div>
              <CardTitle className="text-base">Automatic Analysis</CardTitle>
              <CardDescription>Stack Sentinel monitors your tools daily without manual triggering</CardDescription>
            </div>
            <div className="ml-auto"><Toggle checked={settings.autoAnalysis} onToggle={() => update({ autoAnalysis: !settings.autoAnalysis })} /></div>
          </div>
        </CardHeader>
        {settings.autoAnalysis && (
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-4 py-3">
              <Radio size={14} className="text-blue-400 animate-pulse" />
              <p className="text-sm text-blue-300">Analysis runs automatically at <strong>6 AM UTC</strong> daily via Firebase Cloud Functions</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minimum relevance threshold</span>
                <span className="font-mono text-blue-400">{settings.relevanceThreshold}%</span>
              </div>
              <input
                type="range" min={20} max={90} step={5}
                value={settings.relevanceThreshold}
                onChange={e => update({ relevanceThreshold: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-muted-foreground">Only alerts with confidence above this score will be saved</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Slack Integration ── */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/></svg>
            </div>
            <div>
              <CardTitle className="text-base">Slack Integration</CardTitle>
              <CardDescription>Send alerts directly to your Slack channel</CardDescription>
            </div>
            <div className="ml-auto">
              {slackStatus === "ok" && <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">✓ Connected</Badge>}
              {settings.slackEnabled && slackStatus !== "ok" && <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">✓ Active</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://hooks.slack.com/services/T00.../B00.../xxx"
                value={slackWebhookInput}
                onChange={e => setSlackWebhookInput(e.target.value)}
                className="font-mono text-xs h-10 bg-secondary/30 border-border/50"
              />
              <Button size="sm" onClick={testSlackConnection} disabled={slackStatus === "testing"} className="shrink-0 gap-2 h-10">
                {slackStatus === "testing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {slackStatus === "testing" ? "Testing..." : "Test"}
              </Button>
            </div>
            {slackStatus === "error" && <p className="text-xs text-red-400">{slackError}</p>}
            {slackStatus === "ok" && <p className="text-xs text-green-400">✓ Connected! A test message was sent to your channel.</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Alert Level</label>
            <div className="flex gap-2 flex-wrap">
              {(["critical", "high", "all"] as const).map(level => (
                <label key={level} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm ${settings.slackAlertLevel === level ? "border-yellow-500 bg-yellow-500/10 text-yellow-400" : "border-border/50 text-muted-foreground hover:border-border"}`}>
                  <input type="radio" className="sr-only" checked={settings.slackAlertLevel === level} onChange={() => update({ slackAlertLevel: level })} />
                  {level === "critical" ? "🚨 Critical only" : level === "high" ? "⚠️ Critical + High" : "📌 All alerts"}
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Get a Slack webhook at <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="text-blue-400 underline">api.slack.com/messaging/webhooks</a>
          </p>
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="border-red-500/20 bg-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Settings2 size={18} /></div>
            <div>
              <CardTitle className="text-base text-red-400">Danger Zone</CardTitle>
              <CardDescription>Irreversible account operations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 px-4 py-3 bg-red-500/5">
            <div>
              <p className="text-sm font-semibold">Clear All Data</p>
              <p className="text-xs text-muted-foreground">Delete all stacks, alerts, and scenarios permanently</p>
            </div>
            <Button variant="destructive" size="sm" className="gap-2 shrink-0" onClick={clearAllData} disabled={clearing}>
              {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {clearing ? "Clearing..." : "Clear Data"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
