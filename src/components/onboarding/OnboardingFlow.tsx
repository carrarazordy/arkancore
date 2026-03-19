import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  KeyRound,
  Shield,
  Workflow,
  FolderKanban,
  BrainCircuit,
  TimerReset,
  Fingerprint,
  Eye,
  EyeOff,
  Bolt,
} from "lucide-react";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { loadOnboardingProfile, saveOnboardingProfile } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

interface OnboardingFlowProps {
  userId: string;
  userEmail?: string | null;
  onComplete: () => void;
}

type FocusModule = "operations" | "archive" | "chronos";

const INIT_LOGS = [
  { label: "ESTABLISHING_SECURE_LINK...", status: "DONE" },
  { label: "ALLOCATING_NEURAL_STORAGE...", status: "DONE" },
  { label: "SYNCING_WITH_APPWRITE_NODES...", status: "ACTIVE" },
];

const MODULES: Array<{ id: FocusModule; title: string; description: string; icon: typeof FolderKanban }> = [
  {
    id: "operations",
    title: "OPERATIONS_HUB",
    description: "Task management and kanban protocol deployment for daily objectives.",
    icon: FolderKanban,
  },
  {
    id: "archive",
    title: "NEURAL_ARCHIVE",
    description: "Intelligent repository for notes, memory capture, and AI-synthesized context.",
    icon: BrainCircuit,
  },
  {
    id: "chronos",
    title: "CHRONOS_CONTROL",
    description: "Precision timing and focus cycles to optimize temporal allocation.",
    icon: TimerReset,
  },
];

export function OnboardingFlow({ userId, userEmail, onComplete }: OnboardingFlowProps) {
  const profile = useMemo(() => loadOnboardingProfile(userId), [userId]);
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(profile?.handle ?? userEmail?.split("@")[0]?.toUpperCase() ?? "");
  const [accessKey, setAccessKey] = useState("");
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [focusModule, setFocusModule] = useState<FocusModule>(profile?.focusModule ?? "operations");
  const [error, setError] = useState("");

  useEffect(() => {
    setHandle(profile?.handle ?? userEmail?.split("@")[0]?.toUpperCase() ?? "");
    setFocusModule(profile?.focusModule ?? "operations");
  }, [profile, userEmail]);

  const handleAdvance = () => {
    if (step === 0) {
      ArkanAudio.playFast("system_engage");
      setStep(1);
      return;
    }

    if (step === 1) {
      if (handle.trim().length < 3) {
        setError("Designate a valid user handle before continuing.");
        return;
      }

      if (accessKey.trim().length < 8) {
        setError("Access key must contain at least 8 characters.");
        return;
      }

      setError("");
      ArkanAudio.playFast("system_execute_clack");
      setStep(2);
      return;
    }

    saveOnboardingProfile(userId, {
      handle: handle.trim(),
      focusModule,
      accessKeyConfigured: true,
      completedAt: new Date().toISOString(),
    });

    ArkanAudio.playFast("confirm");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[1200] overflow-hidden bg-[#050503] text-primary font-mono">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.04)_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,0,0.03)_51%,transparent_100%)] bg-[length:100%_4px] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,0,0.1),transparent_26%),radial-gradient(circle_at_bottom,rgba(255,255,0,0.06),transparent_32%)]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
          className="relative flex min-h-screen flex-col px-4 py-6 sm:px-8 sm:py-8"
        >
          {step === 0 && (
            <section className="flex min-h-screen flex-col items-center justify-center">
              <div className="w-full max-w-5xl">
                <div className="mb-10 flex flex-col items-center text-center">
                  <div className="text-[56px] font-black uppercase tracking-[0.26em] text-primary drop-shadow-[0_0_24px_rgba(255,255,0,0.65)] sm:text-[82px] lg:text-[110px]">
                    ARKAN
                  </div>
                  <div className="mt-3 h-px w-56 bg-gradient-to-r from-transparent via-primary/50 to-transparent sm:w-72" />
                  <p className="mt-4 text-[10px] uppercase tracking-[0.48em] text-primary/45 sm:text-[11px]">
                    PERSONAL DIGITAL ASSISTANT // VER 1.0.4
                  </p>
                </div>

                <div className="relative mx-auto w-full max-w-3xl overflow-hidden border border-primary/20 bg-[#0a0a05]/85 p-6 shadow-[0_0_30px_rgba(255,255,0,0.15)] backdrop-blur-sm sm:p-10">
                  <div className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-primary" />
                  <div className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-primary" />
                  <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-primary" />

                  <div className="mb-8 flex items-center justify-between border-b border-primary/10 pb-4">
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]">
                      <Workflow className="h-4 w-4 text-primary/70" />
                      <span>SYSTEM_INITIALIZATION</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary/20" />
                      <div className="h-2 w-2 rounded-full bg-primary/20" />
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="space-y-5 text-sm uppercase tracking-[0.14em] sm:text-[15px]">
                    {INIT_LOGS.map((log, index) => (
                      <div key={log.label} className={cn("flex items-center gap-3", index < 2 ? "opacity-70" : "opacity-100")}>
                        <span className="text-primary/35">&gt;&gt;</span>
                        <span className={cn(index === 2 && "inline-block border-r-2 border-primary pr-1 animate-pulse")}>{log.label}</span>
                        {index < 2 && <span className="ml-auto text-[10px] tracking-[0.3em] text-primary/30">[{log.status}]</span>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 space-y-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                      <div className="h-full w-3/4 bg-primary shadow-[0_0_12px_rgba(255,255,0,0.55)]" />
                    </div>
                    <div className="flex justify-between text-[9px] uppercase tracking-[0.22em] text-primary/35">
                      <span>DATA INTEGRITY: 99.9%</span>
                      <span>SYNCHRONIZING: 74%</span>
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col items-center gap-5">
                    <button
                      type="button"
                      onClick={handleAdvance}
                      className="group flex items-center gap-3 bg-primary px-8 py-4 text-[12px] font-black uppercase tracking-[0.28em] text-black transition-all hover:brightness-110 sm:px-12"
                    >
                      <span>INITIALIZE_COMMAND_CENTER</span>
                      <Bolt className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-primary/30">WARNING: NEURAL MAPPING IS PERMANENT</p>
                  </div>
                </div>

                <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 text-center sm:grid-cols-3">
                  <Metric label="LINK_STATUS" value="SECURE_SSL_V3" withBorder={false} />
                  <Metric label="ENC_MODE" value="RSA_4096_ARKAN" withBorder />
                  <Metric label="NEURAL_LOAD" value="0.0024_MS" withBorder={false} />
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="flex min-h-screen flex-col justify-center py-8">
              <div className="mx-auto w-full max-w-6xl">
                <div className="mb-10 flex flex-col gap-4 border-b border-primary/20 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/65">
                      <span>PHASE_02</span>
                      <div className="h-px w-12 bg-primary/40" />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tight text-primary sm:text-5xl">IDENTITY_SYNCHRONIZATION</h2>
                  </div>
                  <div className="text-[10px] uppercase leading-tight tracking-[0.22em] text-primary/45 lg:text-right">
                    <div>STATUS: ESTABLISHING_SECURE_LINK</div>
                    <div>NODE: ARKAN_AUTH_V2.0</div>
                  </div>
                </div>

                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
                  <div className="border border-primary/20 bg-[#0a0a05]/70 p-6 shadow-[0_0_26px_rgba(255,255,0,0.12)] backdrop-blur-sm sm:p-8">
                    <div className="mb-8">
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                        <Fingerprint className="h-4 w-4" />
                        NEURAL_SIGNATURE_SETUP
                      </h3>
                      <p className="text-[11px] text-primary/55">Define your unique handle and access key for the neural network.</p>
                    </div>

                    <div className="space-y-6">
                      <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-primary/55">USER_HANDLE</span>
                        <div className="flex items-center gap-3 border border-primary/35 bg-black/40 px-4 py-4 focus-within:border-primary">
                          <span className="text-xs text-primary/45">@</span>
                          <input
                            type="text"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value.toUpperCase())}
                            placeholder="DESIGNATE_ID"
                            className="w-full bg-transparent text-sm uppercase tracking-[0.16em] text-primary outline-none placeholder:text-primary/20"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-primary/55">ACCESS_KEY</span>
                        <div className="flex items-center gap-3 border border-primary/35 bg-black/40 px-4 py-4 focus-within:border-primary">
                          <KeyRound className="h-4 w-4 text-primary/45" />
                          <input
                            type={showAccessKey ? "text" : "password"}
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value)}
                            placeholder="••••••••••••••••"
                            className="w-full bg-transparent text-sm tracking-[0.16em] text-primary outline-none placeholder:text-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAccessKey((prev) => !prev)}
                            className="text-primary/45 transition-colors hover:text-primary"
                          >
                            {showAccessKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </label>

                      <div className="flex items-start gap-3 border border-primary/10 bg-primary/5 p-4 text-[10px] leading-relaxed text-primary/60">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p>
                          SECURITY_ALERT: Keys are locally validated before transmission. Arkan core does not store raw plaintext credentials in onboarding state.
                        </p>
                      </div>

                      {error && <p className="text-[10px] uppercase tracking-[0.2em] text-red-400">{error}</p>}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <InfoPanel
                      title="ZERO_KNOWLEDGE_PROTOCOL"
                      body="The identity sync routine verifies your setup without exposing the raw secret to the interface layer."
                      pulse
                    />
                    <InfoPanel
                      title="ENCRYPTION_STANDARDS"
                      body="Every data point is segmented and prepared for distributed storage to avoid singular failure points."
                    />
                    <div className="border border-primary/10 bg-primary/5 p-4 font-mono">
                      <div className="mb-3 text-[9px] uppercase tracking-[0.22em] text-primary/40">LIVE_SYSTEM_METRICS</div>
                      <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between"><span className="text-primary/55">ALGORITHM:</span><span className="text-primary">SHA3-512_HYBRID</span></div>
                        <div className="flex justify-between"><span className="text-primary/55">ENTROPY:</span><span className="text-primary">HIGH_STABILITY</span></div>
                        <div className="flex justify-between"><span className="text-primary/55">LATENCY:</span><span className="text-primary">0.002ms</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={handleAdvance}
                    className="group flex items-center gap-3 bg-primary px-10 py-4 text-[12px] font-black uppercase tracking-[0.32em] text-black transition-all hover:brightness-110"
                  >
                    <span>PROCEED_TO_CALIBRATION</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="relative flex min-h-screen flex-col justify-center overflow-hidden py-8">
              <div className="absolute inset-0 opacity-20 blur-[1px]">
                <div className="mx-auto mt-24 grid h-[520px] max-w-6xl grid-cols-[56px_minmax(0,1fr)] gap-6 px-8">
                  <div className="border-r border-primary/10 pt-8">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center border border-primary/30 text-primary/40"><FolderKanban className="h-4 w-4" /></div>
                    <div className="mb-6 flex h-10 w-10 items-center justify-center border border-primary text-primary"><Workflow className="h-4 w-4" /></div>
                    <div className="flex h-10 w-10 items-center justify-center border border-primary/30 text-primary/40"><TimerReset className="h-4 w-4" /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <PreviewPanel title="OPERATIONS_LOG" />
                    <PreviewPanel title="NEURAL_ARCHIVE" />
                    <PreviewPanel title="CHRONOS_CONTROL" />
                  </div>
                </div>
              </div>

              <div className="absolute left-8 top-8 z-10 hidden items-center gap-4 lg:flex">
                <div className="text-[10px] font-bold text-primary/45">CALIBRATION_PROGRESS</div>
                <div className="flex gap-2">
                  <div className="h-1 w-8 bg-primary/20" />
                  <div className="h-1 w-8 bg-primary/20" />
                  <div className="h-1 w-12 bg-primary shadow-[0_0_8px_#f9f906]" />
                </div>
                <div className="text-[10px] font-bold italic text-primary">PHASE_03: MODULE_MAPPING</div>
              </div>

              <div className="relative z-20 mx-auto w-full max-w-6xl px-4 sm:px-8">
                <div className="grid gap-6 lg:grid-cols-3">
                  {MODULES.map((module) => {
                    const Icon = module.icon;
                    const active = focusModule === module.id;

                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => {
                          setFocusModule(module.id);
                          ArkanAudio.playFast("key_tick_mechanical");
                        }}
                        className={cn(
                          "relative border bg-[#141407]/95 p-6 text-left shadow-[0_0_18px_rgba(255,255,0,0.08)] transition-all",
                          active ? "border-primary text-primary" : "border-primary/20 text-primary/70 hover:border-primary/50"
                        )}
                      >
                        <div className="absolute -top-6 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border border-primary/20 bg-[#141407]" />
                        <div className={cn("absolute -top-[18px] left-1/2 h-4 w-4 -translate-x-1/2 rounded-full", active ? "bg-primary shadow-[0_0_12px_rgba(255,255,0,0.8)]" : "bg-primary/20")} />
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="text-sm font-black uppercase tracking-[0.22em]">{module.title}</div>
                          <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-primary/35")} />
                        </div>
                        <p className="text-[12px] uppercase leading-relaxed tracking-[0.16em] text-primary/70">{module.description}</p>
                        {active && (
                          <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-primary">
                            <Check className="h-4 w-4" />
                            PRIORITY_MODULE_SELECTED
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-14 text-center">
                  <h2 className="text-3xl font-black uppercase tracking-[0.34em] text-primary drop-shadow-[0_0_12px_rgba(255,255,0,0.45)] sm:text-5xl">
                    MODULE_CALIBRATION
                  </h2>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.26em] text-primary/55">
                    All core systems optimized. Ready for neural sync.
                  </p>
                </div>

                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleAdvance}
                    className="group flex items-center gap-3 border border-primary/50 bg-primary/10 px-10 py-4 text-[14px] font-black uppercase tracking-[0.34em] text-primary transition-all hover:border-primary hover:bg-primary/15"
                  >
                    <Bolt className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>ENTER_SYSTEM</span>
                  </button>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value, withBorder }: { label: string; value: string; withBorder: boolean }) {
  return (
    <div className={cn("text-center", withBorder && "border-y border-primary/10 py-1 sm:border-x sm:border-y-0 sm:py-0")}>
      <p className="mb-1 text-[8px] uppercase tracking-[0.22em] text-primary/40">{label}</p>
      <p className="text-[10px] font-bold tracking-[0.18em] text-primary">{value}</p>
    </div>
  );
}

function InfoPanel({ title, body, pulse = false }: { title: string; body: string; pulse?: boolean }) {
  return (
    <div className="border-l-2 border-primary/20 py-2 pl-6">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
        <span className={cn("h-1.5 w-1.5 rounded-full bg-primary/45", pulse && "animate-pulse bg-primary")} />
        {title}
      </h3>
      <p className="text-[11px] italic leading-relaxed text-primary/50">{body}</p>
    </div>
  );
}

function PreviewPanel({ title }: { title: string }) {
  return (
    <div className="border border-primary/10 bg-primary/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-bold text-primary/60">{title}</span>
        <div className="h-2 w-2 rounded-full bg-primary/20" />
      </div>
      <div className="space-y-3">
        <div className="h-2 w-full bg-primary/10" />
        <div className="h-2 w-3/4 bg-primary/10" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 border border-primary/10 bg-primary/5" />
          <div className="h-16 border border-primary/10 bg-primary/5" />
        </div>
      </div>
    </div>
  );
}
