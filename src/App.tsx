import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, AtSign, LockKeyhole, Shield, UserPlus } from "lucide-react";
import { AppShell } from "./components/layout/app-shell";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AudioInitializer } from "./components/layout/AudioInitializer";
import { TechnicalProtocolDialog } from "./components/ui/technical-protocol-dialog";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

import Dashboard from "./pages/Dashboard";
import OperationsPage from "./pages/Operations";
import KanbanPage from "./pages/Kanban";
import NotesPage from "./pages/Notes";
import TimersPage from "./pages/Timers";
import SearchPage from "./pages/Search";
import SettingsPage from "./pages/Settings";
import TasksPage from "./pages/Tasks";

import CalendarPage from "./pages/Calendar";
import ArchivePage from "./pages/Archive";
import ExpeditionsPage from "./pages/Expeditions";

const Shopping = ExpeditionsPage;
const Security = () => <div className="p-8 text-primary font-mono text-xl">IDENTITY_SECURITY // LOCKED</div>;
const GlobalArchive = () => <div className="p-8 text-primary font-mono text-xl">GLOBAL_ARCHIVE // ACCESSED</div>;

type AuthLocationState = {
  message?: string;
  pendingEmail?: string;
};

function formatAuthError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.toUpperCase();
  }

  return "AUTH_PROTOCOL_FAILED";
}

function isEmailConfirmationError(error: unknown) {
  return error instanceof Error && /email not confirmed|email_not_confirmed/i.test(error.message);
}

function getEmailRedirectTo() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/login`;
}

function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = mode === "signup";
  const locationState = (location.state as AuthLocationState | null) ?? null;

  const [nodeName, setNodeName] = React.useState("");
  const [email, setEmail] = React.useState(locationState?.pendingEmail ?? "");
  const [password, setPassword] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState(locationState?.message ?? "");
  const [authError, setAuthError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = React.useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = React.useState(Boolean(locationState?.pendingEmail));

  React.useEffect(() => {
    setStatusMessage(locationState?.message ?? "");
    setCanResendConfirmation(Boolean(locationState?.pendingEmail));

    if (locationState?.pendingEmail) {
      setEmail(locationState.pendingEmail);
    }
  }, [locationState?.message, locationState?.pendingEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!hasSupabaseConfig) {
      setAuthError("SUPABASE_CONFIG_MISSING");
      return;
    }

    if (isSignup && nodeName.trim().length < 3) {
      setAuthError("NODE_NAME_REQUIRES_AT_LEAST_3_CHARACTERS");
      return;
    }

    if (!normalizedEmail) {
      setAuthError("EMAIL_ID_REQUIRED");
      return;
    }

    if (password.length < 6) {
      setAuthError("ACCESS_CODE_REQUIRES_AT_LEAST_6_CHARACTERS");
      return;
    }

    setAuthError("");
    setStatusMessage("");
    setCanResendConfirmation(false);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getEmailRedirectTo(),
            data: {
              node_name: nodeName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          navigate("/dashboard", { replace: true });
          return;
        }

        navigate("/login", {
          replace: true,
          state: {
            message: "NODE_INITIALIZED // VERIFY_EMAIL_TO_COMPLETE_ACCESS",
            pendingEmail: normalizedEmail,
          },
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (isEmailConfirmationError(error)) {
        setAuthError("");
        setStatusMessage("EMAIL_CONFIRMATION_PENDING // CHECK_INBOX_OR_RESEND_LINK");
        setCanResendConfirmation(true);
      } else {
        setAuthError(formatAuthError(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!hasSupabaseConfig) {
      setAuthError("SUPABASE_CONFIG_MISSING");
      return;
    }

    if (!normalizedEmail) {
      setAuthError("EMAIL_ID_REQUIRED");
      return;
    }

    setAuthError("");
    setStatusMessage("");
    setIsResendingConfirmation(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
        },
      });

      if (error) {
        throw error;
      }

      setStatusMessage("CONFIRMATION_LINK_REDISPATCHED // CHECK_EMAIL_INBOX");
      setCanResendConfirmation(true);
    } catch (error) {
      setAuthError(formatAuthError(error));
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const handleGoogleIdentity = async () => {
    if (!hasSupabaseConfig) {
      setAuthError("SUPABASE_CONFIG_MISSING");
      return;
    }

    setAuthError("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      setAuthError(formatAuthError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-primary font-mono">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,0,0.08),transparent_42%),radial-gradient(circle_at_bottom,rgba(255,255,0,0.04),transparent_40%)]" />

      <div className="absolute left-6 top-6 z-10 text-[10px] uppercase tracking-[0.22em] text-primary/70 sm:left-10 sm:top-8">
        <div>SECURE_CONNECTION: ESTABLISHED</div>
        <div>ENCRYPTION: AES_256_GCM</div>
        <div>ARKAN_OS v4.0.2</div>
      </div>

      <div className="absolute right-6 top-6 z-10 text-right text-[10px] uppercase tracking-[0.22em] text-primary/70 sm:right-10 sm:top-8">
        <div>LOCAL_TIME: {new Date().toLocaleTimeString("en-US", { hour12: false })}</div>
        <div>LOCATION: SECTOR_7_HUB</div>
        <div>STATUS: STANDBY</div>
      </div>

      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 py-20 sm:px-10">
        <div className="w-full max-w-[540px]">
          <div className="mx-auto w-full max-w-[360px] border border-primary/30 bg-[#0a0a05]/95 p-6 shadow-[0_0_35px_rgba(255,255,0,0.12)] backdrop-blur-sm sm:max-w-[390px] sm:p-8">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary bg-primary/5 shadow-[0_0_25px_rgba(255,255,0,0.12)]">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-white sm:text-[30px]">
                {isSignup ? "ACCOUNT_INITIALIZATION" : "SYSTEM_AUTHENTICATION"}
              </h1>
              <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
                {isSignup ? "Identity node provisioning required" : "Identity verification required"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <label className="block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-primary/80">NODE_NAME</span>
                  <div className="flex items-center gap-3 border border-primary/15 bg-black/60 px-4 py-3 transition-colors focus-within:border-primary/45">
                    <UserPlus className="h-4 w-4 text-primary/45" />
                    <input
                      type="text"
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value.toUpperCase())}
                      placeholder="ENTER_IDENTIFIER..."
                      autoComplete="nickname"
                      className="w-full bg-transparent text-[12px] uppercase tracking-[0.18em] text-white outline-none placeholder:text-white/18"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-primary/80">EMAIL_ID</span>
                <div className="flex items-center gap-3 border border-primary/15 bg-black/60 px-4 py-3 transition-colors focus-within:border-primary/45">
                  <AtSign className="h-4 w-4 text-primary/45" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ENTER_EMAIL..."
                    autoComplete="email"
                    className="w-full bg-transparent text-[12px] tracking-[0.12em] text-white outline-none placeholder:text-white/18"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.24em] text-primary/80">ACCESS_CODE</span>
                <div className="flex items-center gap-3 border border-primary/15 bg-black/60 px-4 py-3 transition-colors focus-within:border-primary/45">
                  <LockKeyhole className="h-4 w-4 text-primary/45" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignup ? "GENERATE_ACCESS_KEY..." : "........"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="w-full bg-transparent text-[12px] tracking-[0.12em] text-white outline-none placeholder:text-white/18"
                  />
                </div>
              </label>

              {statusMessage && (
                <div className="border border-primary/20 bg-primary/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-primary/80">
                  {statusMessage}
                </div>
              )}

              {authError && (
                <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-red-300">
                  {authError}
                </div>
              )}

              {!hasSupabaseConfig && (
                <div className="border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                  SUPABASE_CONFIG_MISSING // SET VITE_SUPABASE_URL AND PUBLIC KEY
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !hasSupabaseConfig}
                className="flex w-full items-center justify-center gap-3 border border-primary bg-primary/10 px-5 py-3 text-[12px] font-black uppercase tracking-[0.36em] text-primary transition-all hover:bg-primary hover:text-black disabled:cursor-not-allowed disabled:border-primary/20 disabled:bg-primary/5 disabled:text-primary/35"
              >
                <span>
                  {isSubmitting ? (isSignup ? "INITIALIZING..." : "AUTHORIZING...") : isSignup ? "INITIALIZE_NODE" : "AUTHORIZED_ACCESS"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {canResendConfirmation && !isSignup && (
                <button
                  type="button"
                  onClick={() => void handleResendConfirmation()}
                  disabled={isResendingConfirmation || !hasSupabaseConfig}
                  className="w-full border border-primary/20 bg-primary/5 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.28em] text-primary/80 transition-colors hover:border-primary/45 hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-primary/10 disabled:text-primary/25"
                >
                  {isResendingConfirmation ? "REDISPATCHING_CONFIRMATION..." : "RESEND_CONFIRMATION_LINK"}
                </button>
              )}
            </form>

            <div className="my-5 flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.24em] text-white/20">
              <div className="h-px flex-1 bg-primary/10" />
              <span>OR</span>
              <div className="h-px flex-1 bg-primary/10" />
            </div>

            <button
              type="button"
              onClick={() => void handleGoogleIdentity()}
              disabled={isSubmitting || isResendingConfirmation || !hasSupabaseConfig}
              className="w-full border border-primary/15 bg-white/[0.02] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-white/65 transition-colors hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:border-primary/10 disabled:text-white/20"
            >
              GOOGLE_IDENTITY
            </button>

            <div className="mt-6 flex items-center justify-between border-t border-primary/10 pt-5 text-[9px] uppercase tracking-[0.2em] text-white/35">
              <div className="flex items-center gap-2 text-primary/55">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(255,255,0,0.4)]" />
                <span>{isSubmitting || isResendingConfirmation ? "AUTH_CHANNEL_BUSY" : "NODE_ACTIVE"}</span>
              </div>
              <span>PORT: 8080</span>
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-[390px] flex-col items-center text-center">
            <Link
              to={isSignup ? "/login" : "/signup"}
              className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary transition-colors hover:text-white"
            >
              {isSignup ? "RETURN TO AUTHORIZATION" : "NEW USER? INITIALIZE ACCOUNT"}
            </Link>
            <p className="mt-4 max-w-[320px] text-[9px] uppercase leading-relaxed tracking-[0.18em] text-white/20">
              Access restricted to authorized personnel. Unauthorized attempts are logged and reported.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Login = () => <AuthScreen mode="login" />;
const Signup = () => <AuthScreen mode="signup" />;

export default function App() {
  return (
    <BrowserRouter>
      <AudioInitializer />
      <AuthGuard>
        <Routes>
          <Route
            path="*"
            element={
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/operations" element={<OperationsPage />} />
                  <Route path="/kanban" element={<KanbanPage />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/archive" element={<ArchivePage />} />
                  <Route path="/expeditions" element={<ExpeditionsPage />} />
                  <Route path="/timers" element={<TimersPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/shopping" element={<Shopping />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/dashboard/global-archive" element={<GlobalArchive />} />
                  <Route path="*" element={<div className="p-8 text-red-500 font-mono text-xl">404 // SECTOR_NOT_FOUND</div>} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </AuthGuard>
      <TechnicalProtocolDialog />
    </BrowserRouter>
  );
}



