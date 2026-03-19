import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Cpu,
  Database,
  KeyRound,
  LoaderCircle,
  Mail,
  Palette,
  Shield,
  Terminal,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useChronosStore } from "@/store/useChronosStore";
import { useHardwareMetrics } from "@/store/useHardwareMetrics";
import {
  type AudioLevels,
  type SettingsSnapshot,
  useSettingsStore,
} from "@/store/useSettingsStore";
import { THEME_SWATCHES, type AccentTheme, useThemeStore } from "@/store/useTheme";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

const THEME_LABELS: Record<AccentTheme, string> = {
  yellow: "YELLOW",
  green: "GREEN",
  red: "RED",
  purple: "PURPLE",
  orange: "ORANGE",
  cyan: "CYAN",
  white: "WHITE",
};

const AUDIO_KEYS: Array<{ key: keyof AudioLevels; label: string }> = [
  { key: "master", label: "MASTER_VOLUME" },
  { key: "keyboard", label: "KEYBOARD_FEEDBACK" },
  { key: "confirmation", label: "UI_CONFIRMATION" },
  { key: "ambient", label: "AMBIENT_HUM" },
];

function encodePayload(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodePayload(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function triggerDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatTimezoneLabel(timezone: string) {
  try {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? "UTC";

    const suffix = timezone.split("/").pop()?.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase() ?? timezone.toUpperCase();
    return `${offset.replace("GMT", "UTC").replace(/\s+/g, "")}_${suffix}`;
  } catch {
    return timezone.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
  }
}

function getRecoveryRedirect() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/settings`;
}

function formatUptime(startTimestamp: number) {
  const elapsed = Math.max(0, Date.now() - startTimestamp);
  const totalSeconds = Math.floor(elapsed / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [days, hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function extractSnapshot(payload: unknown): { snapshot: Partial<SettingsSnapshot>; theme?: AccentTheme } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.format === "string" && record.format === "ARKAN_BACKUP_V1" && typeof record.payload === "string") {
    try {
      const decoded = JSON.parse(decodePayload(record.payload)) as Record<string, unknown>;
      return extractSnapshot(decoded);
    } catch {
      return null;
    }
  }

  if (record.settings && typeof record.settings === "object") {
    return {
      snapshot: record.settings as Partial<SettingsSnapshot>,
      theme: typeof record.theme === "string" ? (record.theme as AccentTheme) : undefined,
    };
  }

  if (record.audioLevels || record.timezone || record.version || record.buildNode) {
    return {
      snapshot: record as Partial<SettingsSnapshot>,
      theme: typeof record.theme === "string" ? (record.theme as AccentTheme) : undefined,
    };
  }

  return null;
}

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [resetError, setResetError] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const audioLevels = useSettingsStore((state) => state.audioLevels);
  const timezone = useSettingsStore((state) => state.timezone);
  const syncActive = useSettingsStore((state) => state.syncActive);
  const version = useSettingsStore((state) => state.version);
  const buildNode = useSettingsStore((state) => state.buildNode);
  const lastBackupAt = useSettingsStore((state) => state.lastBackupAt);
  const setAudioLevel = useSettingsStore((state) => state.setAudioLevel);
  const setTimezone = useSettingsStore((state) => state.setTimezone);
  const toggleSync = useSettingsStore((state) => state.toggleSync);
  const markBackup = useSettingsStore((state) => state.markBackup);
  const importSnapshot = useSettingsStore((state) => state.importSnapshot);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const metrics = useHardwareMetrics((state) => state.metrics);
  const updateMetrics = useHardwareMetrics((state) => state.updateMetrics);
  const uptime = useChronosStore((state) => state.uptime);
  const heartbeatMs = useChronosStore((state) => state.heartbeatMs);

  const logs = useSystemLogStore((state) => state.logs);
  const addLog = useSystemLogStore((state) => state.addLog);

  const timezoneOptions = useMemo(() => Array.from(new Set([
    timezone,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    "UTC",
    "Asia/Tokyo",
    "America/Sao_Paulo",
    "America/New_York",
    "Europe/London",
  ])), [timezone]);

  const terminalLogs = useMemo(() => logs.slice(0, 12).reverse(), [logs]);
  const currentSnapshot = useMemo<SettingsSnapshot>(() => ({
    audioLevels,
    timezone,
    syncActive,
    lastBackupAt,
    version,
    buildNode,
  }), [audioLevels, buildNode, lastBackupAt, syncActive, timezone, version]);
  const sessionNode = useMemo(() => {
    const local = sessionEmail.split("@")[0]?.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
    return local ? `${local}_NODE` : "ACTIVE_SESSION_MAIN";
  }, [sessionEmail]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setSessionEmail("");
      return;
    }

    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionEmail(session?.user.email ?? "");
    };

    void syncAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSessionEmail(session?.user.email ?? "");

      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setResetError("");
        setResetStatus("PASSWORD_RECOVERY_CHANNEL_OPEN // DEFINE_NEW_ACCESS_CODE");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    addLog("CORE: LOADING_CONFIGURATION_MODULES", "system");
    addLog("SUCCESS: DATA_CORE_MODULE_MOUNTED", "status");
    addLog("SUCCESS: AUDIO_ENGINE_INITIALIZED", "status");
  }, [addLog]);

  useEffect(() => {
    ArkanAudio.setAudioLevels(audioLevels);
  }, [audioLevels]);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [updateMetrics]);
  const handleThemeChange = (nextTheme: AccentTheme) => {
    setTheme(nextTheme);
    ArkanAudio.playFast("key_tick_mechanical");
    addLog(`VISUAL_INTERFACE_RECALIBRATED: ${THEME_LABELS[nextTheme]}`, "system");
  };

  const handleAudioChange = (key: keyof AudioLevels, rawValue: number) => {
    setAudioLevel(key, rawValue);
  };

  const commitAudioChange = (key: keyof AudioLevels, rawValue: number) => {
    ArkanAudio.playFast("key_tick_mechanical");
    addLog(`AUDIO_ENGINE_UPDATED: ${key.toUpperCase()}_${Math.round(rawValue * 100)}PCT`, "system");
  };

  const handleTimezoneChange = (nextTimezone: string) => {
    setTimezone(nextTimezone);
    ArkanAudio.playFast("system_execute_clack");
    addLog(`TIMEZONE_REALIGNED: ${formatTimezoneLabel(nextTimezone)}`, "system");
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      theme,
      settings: currentSnapshot,
    };

    triggerDownload("arkan-settings.json", JSON.stringify(payload, null, 2), "application/json");
    markBackup();
    ArkanAudio.playFast("system_execute_clack");
    addLog("EXPORT_JSON_READY", "system");
  };

  const handleEncryptedBackup = () => {
    const wrapper = {
      format: "ARKAN_BACKUP_V1",
      generatedAt: new Date().toISOString(),
      payload: encodePayload(JSON.stringify({ theme, settings: currentSnapshot })),
    };

    triggerDownload("arkan-secure-backup.bak", JSON.stringify(wrapper, null, 2), "application/json");
    markBackup();
    ArkanAudio.playFast("system_engage");
    addLog("ENCRYPT_BACKUP_READY", "system");
  };

  const handleExportAllData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      theme,
      settings: currentSnapshot,
      metrics: {
        cpu: metrics.cpu,
        ram: metrics.ram,
        latencyMs: Math.round(heartbeatMs),
      },
      logs: terminalLogs,
    };

    triggerDownload("arkan-system-export.json", JSON.stringify(payload, null, 2), "application/json");
    markBackup();
    ArkanAudio.playFast("system_execute_clack");
    addLog("EXPORT_ALL_DATA_READY", "system");
  };

  const handleRestoreRequest = () => {
    fileInputRef.current?.click();
    ArkanAudio.playFast("key_tick_mechanical");
    addLog("RESTORE_LOCAL_CHANNEL_OPEN", "system");
  };

  const handleRestoreFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const extracted = extractSnapshot(parsed);

      if (!extracted) {
        throw new Error("INVALID_RESTORE_PAYLOAD");
      }

      importSnapshot(extracted.snapshot);
      if (extracted.theme) {
        setTheme(extracted.theme);
      }

      ArkanAudio.playFast("system_execute_clack");
      addLog(`RESTORE_LOCAL_APPLIED: ${file.name.toUpperCase()}`, "status");
    } catch (error) {
      ArkanAudio.playFast("key_tick_mechanical");
      addLog(`RESTORE_LOCAL_REJECTED: ${error instanceof Error ? error.message : "UNKNOWN_ERROR"}`, "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleResetDefaults = () => {
    resetSettings();
    setTheme("yellow");
    ArkanAudio.playFast("system_engage");
    addLog("DEFAULT_CONFIGURATION_RESTORED", "system");
  };

  const handleSendPasswordReset = async () => {
    if (!hasSupabaseConfig) {
      setResetError("SUPABASE_CONFIG_MISSING");
      setResetStatus("");
      return;
    }

    if (!sessionEmail) {
      setResetError("ACCOUNT_EMAIL_UNAVAILABLE");
      setResetStatus("");
      return;
    }

    setIsSendingReset(true);
    setResetError("");
    setResetStatus("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sessionEmail, {
        redirectTo: getRecoveryRedirect(),
      });

      if (error) {
        throw error;
      }

      setResetStatus("RECOVERY_LINK_DISPATCHED // CHECK_REGISTERED_EMAIL");
      addLog(`PASSWORD_RESET_DISPATCHED:${sessionEmail.toUpperCase()}`, "status");
      ArkanAudio.playFast("system_execute_clack");
    } catch (error) {
      const message = error instanceof Error ? error.message.toUpperCase() : "PASSWORD_RESET_FAILED";
      setResetError(message);
      addLog(`PASSWORD_RESET_FAILED:${message}`, "error");
      ArkanAudio.playFast("key_tick_mechanical");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!hasSupabaseConfig) {
      setResetError("SUPABASE_CONFIG_MISSING");
      setResetStatus("");
      return;
    }

    if (newPassword.length < 8) {
      setResetError("NEW_ACCESS_CODE_REQUIRES_8_CHARACTERS");
      setResetStatus("");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("ACCESS_CODE_CONFIRMATION_MISMATCH");
      setResetStatus("");
      return;
    }

    setIsUpdatingPassword(true);
    setResetError("");
    setResetStatus("");

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }

      setResetStatus("ACCESS_CODE_RESEALED // NEW_CREDENTIAL_ACTIVE");
      setIsRecoveryMode(false);
      setNewPassword("");
      setConfirmPassword("");
      addLog("PASSWORD_ROTATION_SUCCESS", "status");
      ArkanAudio.playFast("system_engage");

      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.toUpperCase() : "ACCESS_CODE_UPDATE_FAILED";
      setResetError(message);
      addLog(`PASSWORD_ROTATION_FAILED:${message}`, "error");
      ArkanAudio.playFast("key_tick_mechanical");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-black font-mono text-white selection:bg-primary selection:text-black">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.045)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.03)_1px,transparent_1px)] bg-[size:14px_14px] opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,0,0.07),transparent_34%)]" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.bak,application/json"
        className="hidden"
        onChange={handleRestoreFile}
      />

      <header className="relative z-10 border-b border-primary/15 bg-black/85 backdrop-blur-sm">
        <div className="flex flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary shadow-[0_0_18px_rgba(255,255,0,0.14)]">
              <Palette className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black uppercase tracking-[0.24em] text-primary sm:text-base">SYSTEM_CONFIGURATION // SETTINGS_V1.0</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-primary/65">
                <HeaderMetric label="CPU" value={`${metrics.cpu}%`} tone="green" />
                <HeaderMetric label="RAM" value={`${metrics.ram.toFixed(1)}GB`} tone="yellow" />
                <HeaderMetric label="LATENCY" value={`${Math.round(heartbeatMs)}MS`} tone="blue" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 xl:justify-end">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary/35">CURRENT TIMEZONE</div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-primary">{formatTimezoneLabel(timezone)}</div>
            </div>
            <select
              value={timezone}
              onChange={(event) => handleTimezoneChange(event.target.value)}
              className="border border-primary/20 bg-black/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary outline-none transition-colors hover:border-primary/45"
            >
              {timezoneOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <div className="flex h-11 w-11 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
              <span className="text-[11px] font-black tracking-[0.18em]">A</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-5 custom-scrollbar sm:p-6 md:p-8">
        <div className="grid grid-cols-12 gap-6">
          <SectionFrame className="col-span-12 lg:col-span-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionTitle icon={Database} title="DATA_CORE" subtitle="Cloud Uplink & Local Redundancy" />
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleSync();
                  addLog(`SYNC_STATE_${syncActive ? "DISABLED" : "ENABLED"}`, "system");
                  ArkanAudio.playFast("key_tick_mechanical");
                }}
                className={cn(
                  "border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  syncActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/10 bg-black/30 text-white/45 hover:border-primary/30 hover:text-primary"
                )}
              >
                {syncActive ? "SYNC_ACTIVE" : "SYNC_IDLE"}
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(220px,0.92fr)_minmax(0,1fr)]">
              <div className="flex min-h-[240px] flex-col items-center justify-center border border-primary/12 bg-black/35 p-5 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary shadow-[0_0_18px_rgba(255,255,0,0.12)]">
                  <Shield className="h-9 w-9" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-primary/35">STATUS</div>
                <div className="mt-2 text-lg font-black uppercase tracking-[0.18em] text-primary">{syncActive ? "UPLINK_LIVE" : "LOCAL_ONLY"}</div>
                <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-primary/28">LAST_BACKUP: {lastBackupAt ? new Date(lastBackupAt).toLocaleString("en-US", { hour12: false }) : "NO_SNAPSHOT"}</div>
              </div>

              <div className="space-y-3">
                <ActionButton label="EXPORT_JSON" onClick={handleExportJson} />
                <ActionButton label="ENCRYPT_BACKUP" onClick={handleEncryptedBackup} />
                <ActionButton label="RESTORE_LOCAL" onClick={handleRestoreRequest} muted />
                <ActionButton label="RESET_DEFAULTS" onClick={handleResetDefaults} muted />
              </div>
            </div>
          </SectionFrame>

          <SectionFrame className="col-span-12 lg:col-span-6">
            <SectionTitle icon={Palette} title="VISUAL_INTERFACE" subtitle="Chromatic Node Selector" />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {(Object.keys(THEME_SWATCHES) as AccentTheme[]).map((option) => {
                const active = theme === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleThemeChange(option)}
                    className="group text-center"
                  >
                    <div
                      className={cn(
                        "flex aspect-square items-center justify-center border-2 transition-all",
                        active && "shadow-[0_0_18px_rgba(255,255,0,0.22)]"
                      )}
                      style={{
                        borderColor: THEME_SWATCHES[option],
                        backgroundColor: active ? THEME_SWATCHES[option] : "transparent",
                        color: option === "white" || !active ? THEME_SWATCHES[option] : "#000000",
                      }}
                    >
                      {active ? <Check className="h-4 w-4" /> : null}
                    </div>
                    <div className={cn("mt-2 text-[9px] font-bold uppercase tracking-[0.16em]", active ? "text-primary" : "text-primary/35 group-hover:text-primary/60")}>{THEME_LABELS[option]}</div>
                  </button>
                );
              })}
            </div>
          </SectionFrame>
          <SectionFrame className="col-span-12 lg:col-span-8">
            <SectionTitle icon={Volume2} title="AUDIO_ENGINE" subtitle="Acoustic Feedback Modulation" />
            <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
              {AUDIO_KEYS.map(({ key, label }) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
                    <span className="font-bold text-primary">{label}</span>
                    <span className="text-primary">{Math.round(audioLevels[key] * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioLevels[key]}
                    onChange={(event) => handleAudioChange(key, parseFloat(event.target.value))}
                    onMouseUp={(event) => commitAudioChange(key, parseFloat((event.currentTarget as HTMLInputElement).value))}
                    onTouchEnd={(event) => commitAudioChange(key, parseFloat((event.currentTarget as HTMLInputElement).value))}
                    onKeyUp={(event) => commitAudioChange(key, parseFloat((event.currentTarget as HTMLInputElement).value))}
                    className="w-full accent-primary"
                  />
                </div>
              ))}
            </div>
          </SectionFrame>

          <SectionFrame className="col-span-12 lg:col-span-4">
            <SectionTitle icon={Cpu} title="SYSTEM_INFO" subtitle="Runtime, Build & Access Metadata" />
            <div className="mt-6 space-y-3 text-[11px] uppercase tracking-[0.16em]">
              <InfoRow label="VERSION" value={version} highlight />
              <InfoRow label="BUILD_NODE" value={buildNode} />
              <InfoRow label="UPTIME" value={formatUptime(uptime)} />
              <InfoRow label="THEME" value={THEME_LABELS[theme]} />
              <InfoRow label="ACCOUNT_EMAIL" value={sessionEmail || "UNBOUND"} />
              <InfoRow label="SESSION_NODE" value={sessionNode} />
              <InfoRow label="AUTH_BACKEND" value={hasSupabaseConfig ? "SUPABASE_LINKED" : "CONFIG_MISSING"} />
              <InfoRow label="CONFIG_SECURE" value={syncActive ? "TRUE" : "DEGRADED"} />
            </div>

            <div className="mt-6 border border-primary/12 bg-black/35 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 text-primary/55">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">ACCESS_SECURITY</div>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-primary/35">
                    Email recovery route for access-code rotation.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-none border border-primary/10 bg-black/40 p-3 text-[10px] uppercase tracking-[0.16em]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-primary/35">RECOVERY_CHANNEL</span>
                  <span className={cn("text-right font-bold", sessionEmail ? "text-primary" : "text-red-400")}>
                    {sessionEmail || "NO_ACTIVE_EMAIL"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-primary/35">RECOVERY_MODE</span>
                  <span className={cn("font-bold", isRecoveryMode ? "text-primary" : "text-white/55")}>
                    {isRecoveryMode ? "TOKEN_VERIFIED" : "STANDBY"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={isSendingReset || !hasSupabaseConfig || !sessionEmail}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 border px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                  isSendingReset || !hasSupabaseConfig || !sessionEmail
                    ? "cursor-not-allowed border-white/10 bg-black/20 text-white/30"
                    : "border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-black"
                )}
              >
                {isSendingReset ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                <span>{isSendingReset ? "DISPATCHING_RECOVERY_LINK" : "SEND_PASSWORD_RESET"}</span>
              </button>

              {resetStatus ? (
                <div className="mt-3 border border-green-500/30 bg-green-500/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-green-400">
                  {resetStatus}
                </div>
              ) : null}

              {resetError ? (
                <div className="mt-3 border border-red-500/30 bg-red-500/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">
                  {resetError}
                </div>
              ) : null}

              {isRecoveryMode ? (
                <div className="mt-4 space-y-3 border border-primary/12 bg-black/40 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    PASSWORD_RECOVERY_CHANNEL_OPEN
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase tracking-[0.18em] text-primary/35">
                      NEW_ACCESS_CODE
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full border border-primary/15 bg-black/60 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary outline-none transition-colors focus:border-primary/45"
                      placeholder="MINIMUM_8_CHARACTERS"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] uppercase tracking-[0.18em] text-primary/35">
                      CONFIRM_ACCESS_CODE
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full border border-primary/15 bg-black/60 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary outline-none transition-colors focus:border-primary/45"
                      placeholder="REPEAT_ACCESS_CODE"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword || !hasSupabaseConfig}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 border px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                      isUpdatingPassword || !hasSupabaseConfig
                        ? "cursor-not-allowed border-white/10 bg-black/20 text-white/30"
                        : "border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-black"
                    )}
                  >
                    {isUpdatingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    <span>{isUpdatingPassword ? "SEALING_NEW_ACCESS_CODE" : "COMMIT_NEW_PASSWORD"}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleExportAllData}
              className="mt-8 w-full border border-red-500/50 px-4 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-red-400 transition-all hover:bg-red-500 hover:text-black"
            >
              EXPORT_ALL_DATA
            </button>
          </SectionFrame>

          <SectionFrame className="col-span-12 min-h-[260px]">
            <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary/65" />
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,255,0,0.8)]" />
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">TERMINAL_STDOUT // SETTINGS_CHANGELOG</div>
              </div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-primary/30">PROCESS: SETTINGS_DAEMON</div>
            </div>
            <div className="mt-4 space-y-2 overflow-y-auto pr-2 text-[11px] leading-relaxed custom-scrollbar">
              {terminalLogs.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <span className="shrink-0 text-primary/28">[{log.timestamp}]</span>
                  <span className={cn(
                    "uppercase tracking-[0.08em]",
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "status"
                        ? "text-green-400"
                        : "text-primary/75"
                  )}>
                    {log.message.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </SectionFrame>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col gap-3 border-t border-primary/15 bg-black/85 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-primary/70 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>SYSTEM_HEALTH: OPTIMAL</span>
          </div>
          <span className="text-primary/35">CONFIG_SECURE: {syncActive ? "TRUE" : "FALSE"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <span className="text-primary">A.R.K.A.N_SYSTEM_NODE</span>
          <span className="text-primary/35">{sessionNode}</span>
        </div>
      </footer>
    </div>
  );
}

function HeaderMetric({ label, value, tone }: { label: string; value: string; tone: "green" | "yellow" | "blue" }) {
  const dotClass = tone === "green" ? "bg-green-500" : tone === "blue" ? "bg-blue-500" : "bg-primary";

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      <span>{label}: {value}</span>
    </div>
  );
}

function SectionFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden border border-primary/18 bg-black/40 p-6", className)}>
      <span className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-primary/80" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-primary/80" />
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-primary/55">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-lg font-black uppercase tracking-[0.16em] text-primary">{title}</h2>
        <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-primary/32">{subtitle}</p>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, muted = false }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
        muted
          ? "border border-white/10 bg-black/25 text-white/45 hover:border-primary/35 hover:text-primary"
          : "border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-black"
      )}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-primary/35">{label}</span>
      <span className={cn("text-right", highlight ? "font-black text-primary" : "text-white/70")}>{value}</span>
    </div>
  );
}








