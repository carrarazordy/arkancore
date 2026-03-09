import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/app-shell";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AudioInitializer } from "./components/layout/AudioInitializer";
import { TechnicalProtocolDialog } from "./components/ui/technical-protocol-dialog";

import Dashboard from "./pages/Dashboard";
import OperationsPage from "./pages/Operations";
import KanbanPage from "./pages/Kanban";
import NotesPage from "./pages/Notes";
import TimersPage from "./pages/Timers";

// Placeholder pages
import CalendarPage from "./pages/Calendar";
import ArchivePage from "./pages/Archive";
import ExpeditionsPage from "./pages/Expeditions";
const Shopping = () => <div className="p-8 text-primary font-mono text-xl">LOGISTICS // PENDING</div>;
const Security = () => <div className="p-8 text-primary font-mono text-xl">IDENTITY_SECURITY // LOCKED</div>;
const Settings = () => <div className="p-8 text-primary font-mono text-xl">SYSTEM_SETTINGS // CONFIGURED</div>;
const Tasks = () => <div className="p-8 text-primary font-mono text-xl">ALL_ARCHIVES // LOADED</div>;
const GlobalArchive = () => <div className="p-8 text-primary font-mono text-xl">GLOBAL_ARCHIVE // ACCESSED</div>;

const Login = () => <div className="min-h-screen flex items-center justify-center bg-black text-primary font-mono text-xl border border-primary/20 p-8">LOGIN_PROTOCOL_REQUIRED</div>;
const Signup = () => <div className="min-h-screen flex items-center justify-center bg-black text-primary font-mono text-xl border border-primary/20 p-8">REGISTRATION_PROTOCOL</div>;

export default function App() {
  console.log("App: Rendering...");
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
                  <Route path="/shopping" element={<Shopping />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/tasks" element={<Tasks />} />
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
