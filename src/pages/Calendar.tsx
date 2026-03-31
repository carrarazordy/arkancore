import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  addWeeks,
  differenceInMinutes,
  differenceInSeconds,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import {
  AlarmClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grip,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAuthBypassed } from "@/lib/auth";
import {
  buildTaskPromotionDraft,
  buildTemporalPayload,
  createDraft,
  DURATION_OPTIONS,
  getUpcomingEvent,
  type EventDraft,
  type TemporalEvent,
} from "@/lib/calendar";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { cn } from "@/lib/utils";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { useTaskStore } from "@/store/useTaskStore";

const PRIORITY_STYLES: Record<TemporalEvent["priority"], string> = {
  LOW: "border-[#5f6b2e] bg-[#101207] text-[#c8d264]",
  MEDIUM: "border-[#8e950f] bg-[#141705] text-[#effd63]",
  HIGH: "border-[#f7ff55] bg-[#1b1b04] text-[#fffdb2] shadow-[0_0_18px_rgba(247,255,85,0.16)]",
};

function toIsoAtTime(day: Date, hours: number, minutes: number) {
  const next = new Date(day);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function createLocalTestEvents(weekStart: Date): TemporalEvent[] {
  const briefingDay = addDays(weekStart, 1);
  const reviewDay = addDays(weekStart, 3);

  return sortEvents([
    {
      id: `local-event-${format(weekStart, "yyyyMMdd")}-1`,
      title: "LOCAL_TEST_BRIEFING",
      start_timestamp: toIsoAtTime(briefingDay, 9, 0),
      end_timestamp: toIsoAtTime(briefingDay, 10, 30),
      priority: "HIGH",
      description: "AUTH BYPASS MODE ENABLED FOR UI VALIDATION.",
      tags: ["LOCAL", "TEST", "BRIEFING"],
    },
    {
      id: `local-event-${format(weekStart, "yyyyMMdd")}-2`,
      title: "DESIGN_REVIEW",
      start_timestamp: toIsoAtTime(reviewDay, 14, 0),
      end_timestamp: toIsoAtTime(reviewDay, 15, 0),
      priority: "MEDIUM",
      description: "Mock event injected locally while auth is bypassed.",
      tags: ["LOCAL", "UX"],
    },
  ]);
}

function normalizeEventRow(row: any): TemporalEvent {
  return {
    id: String(row.id),
    title: String(row.title ?? "UNTITLED_EVENT").toUpperCase(),
    start_timestamp: String(row.start_timestamp),
    end_timestamp: String(row.end_timestamp),
    priority: row.priority === "HIGH" || row.priority === "LOW" ? row.priority : "MEDIUM",
    description: row.description ? String(row.description) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map((tag: unknown) => String(tag).toUpperCase()) : [],
  };
}

function sortEvents(events: TemporalEvent[]) {
  return [...events].sort(
    (left, right) => new Date(left.start_timestamp).getTime() - new Date(right.start_timestamp).getTime()
  );
}

function formatCountdown(event: TemporalEvent | null, referenceNow: Date) {
  if (!event) {
    return "IDLE";
  }

  const seconds = Math.max(0, differenceInSeconds(new Date(event.start_timestamp), referenceNow));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function formatRange(event: TemporalEvent) {
  const start = parseISO(event.start_timestamp);
  const end = parseISO(event.end_timestamp);
  return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
}

function FieldLabel({ children }: { children: string }) {
  return <p className="text-[10px] uppercase tracking-[0.36em] text-[#87901d]">{children}</p>;
}

interface TemporalDayColumnProps {
  day: Date;
  events: TemporalEvent[];
  isActive: boolean;
  isDropTarget: boolean;
  searchQuery: string;
  onActivate: (day: Date) => void;
  onCreate: (day: Date) => void;
  onTaskDrop: (event: DragEvent<HTMLDivElement>, day: Date) => void;
  onTaskDragEnter: (day: Date) => void;
  onTaskDragLeave: () => void;
}

function TemporalDayColumn({
  day,
  events,
  isActive,
  isDropTarget,
  searchQuery,
  onActivate,
  onCreate,
  onTaskDrop,
  onTaskDragEnter,
  onTaskDragLeave,
}: TemporalDayColumnProps) {
  const emptyLabel = searchQuery.trim() ? "NO_MATCHING_EVENTS" : isToday(day) ? "NEW ENTRY READY" : "NO_SCHEDULED_EVENTS";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onActivate(day)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate(day);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={() => onTaskDragEnter(day)}
      onDragLeave={onTaskDragLeave}
      onDrop={(event) => onTaskDrop(event, day)}
      className={cn(
        "relative flex min-h-[420px] min-w-[220px] flex-col border border-[#20230a] bg-[#060703]/95 p-3 text-left transition-all duration-200",
        isActive && "border-[#9faa1d] bg-[#0a0b04] shadow-[0_0_20px_rgba(241,255,75,0.08)]",
        isDropTarget && "border-[#f5ff54] shadow-[0_0_26px_rgba(245,255,84,0.2)]"
      )}
    >
      <div className="mb-3 border-b border-[#1d2109] pb-3">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#6f761e]">{format(day, "EEE")} // {format(day, "dd")}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#eef86e]">{format(day, "EEE // dd")}</p>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#6f761e]">
              {isToday(day) ? "ACTIVE_CYCLE" : "TEMPORAL_NODE"}
            </p>
          </div>
          {isActive ? <span className="h-2.5 w-2.5 rounded-full bg-[#effa47] shadow-[0_0_12px_rgba(239,250,71,0.65)]" /> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "rounded-none border p-3 transition-colors duration-200",
              PRIORITY_STYLES[event.priority]
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#798125]">{formatRange(event)}</p>
                <h3 className="mt-2 text-base font-semibold uppercase tracking-[0.14em] text-[#f4fb6f]">{event.title}</h3>
              </div>
              <span className="rounded-none border border-[#3a3f11] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[#d3d97e]">
                {event.priority}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.22em] text-[#aab254]">
              {(event.tags.length ? event.tags : ["TIMELINE"]).slice(0, 3).map((tag) => (
                <span key={`${event.id}-${tag}`} className="border border-[#373b10] px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}

        {!events.length ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreate(day);
            }}
            className={cn(
              "flex min-h-[108px] flex-1 items-center justify-center border border-dashed px-4 text-center text-[11px] uppercase tracking-[0.3em] transition-colors duration-200",
              isActive
                ? "border-[#858d21] bg-[#131506] text-[#dce65f] hover:border-[#eef95b] hover:text-[#fffcb8]"
                : "border-[#2a2d10] text-[#5f6523] hover:border-[#737b26] hover:text-[#cfd95d]"
            )}
          >
            {emptyLabel}
          </button>
        ) : null}

        {isActive ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreate(day);
            }}
            className="flex items-center justify-center gap-2 border border-[#767e25] bg-[#1a1d07] px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#eef95a] transition-colors duration-200 hover:bg-[#242808]"
          >
            <Plus className="h-4 w-4" />
            NEW ENTRY
          </button>
        ) : null}
      </div>
    </div>
  );
}
interface CreateEventModalProps {
  isOpen: boolean;
  draft: EventDraft;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (field: keyof EventDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function CreateEventModal({ isOpen, draft, isSubmitting, onClose, onChange, onSubmit }: CreateEventModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onSubmit={onSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-4xl border border-[#d9eb3d] bg-[#050603] shadow-[0_0_30px_rgba(217,235,61,0.18)]"
          >
            <div className="flex items-start justify-between gap-6 border-b border-[#596113] px-8 py-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.36em] text-[#8d961f]">MODE: SEQUENCE_ENTRY v2.0</p>
                <h2 className="mt-2 text-3xl font-semibold uppercase tracking-[0.18em] text-[#edf752]">
                  INITIALIZING_NEW_TEMPORAL_SEQUENCE
                </h2>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex items-center gap-1.5 text-[#eff74f]">
                  <span className="h-3 w-3 bg-[#eaf73f]" />
                  <span className="h-3 w-3 bg-[#9ea625]" />
                  <span className="h-3 w-3 bg-[#5f6619]" />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-[#737c1c] p-2 text-[#eaf33b] transition-colors duration-200 hover:bg-[#181b06]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-6 border-b border-[#2f340c] px-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <FieldLabel>EVENT_IDENTIFIER [ID]</FieldLabel>
                  <input
                    value={draft.title}
                    onChange={(event) => onChange("title", event.target.value)}
                    placeholder="ENTER_UNIQUE_ID_STRING..."
                    className="w-full border border-[#4d5314] bg-[#0d0f05] px-5 py-4 text-lg uppercase tracking-[0.16em] text-[#eef76c] outline-none transition-colors duration-200 placeholder:text-[#545a25] focus:border-[#eff84e]"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <FieldLabel>TEMPORAL_DATE</FieldLabel>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => onChange("date", event.target.value)}
                      className="w-full border border-[#4d5314] bg-[#0d0f05] px-5 py-4 text-base uppercase tracking-[0.16em] text-[#eef76c] outline-none focus:border-[#eff84e]"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>TEMPORAL_TIMESTAMP</FieldLabel>
                    <input
                      type="time"
                      value={draft.time}
                      onChange={(event) => onChange("time", event.target.value)}
                      className="w-full border border-[#4d5314] bg-[#0d0f05] px-5 py-4 text-base uppercase tracking-[0.16em] text-[#eef76c] outline-none focus:border-[#eff84e]"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>DURATION_WINDOW</FieldLabel>
                    <select
                      value={draft.duration}
                      onChange={(event) => onChange("duration", event.target.value)}
                      className="w-full border border-[#4d5314] bg-[#0d0f05] px-5 py-4 text-base uppercase tracking-[0.16em] text-[#eef76c] outline-none focus:border-[#eff84e]"
                    >
                      {DURATION_OPTIONS.map((minutes) => (
                        <option key={minutes} value={minutes.toString()}>
                          {minutes} MIN
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>SUPPLEMENTAL_DATA</FieldLabel>
                  <textarea
                    value={draft.description}
                    onChange={(event) => onChange("description", event.target.value)}
                    placeholder="APPEND_NOTES_TO_SEQUENCE..."
                    className="min-h-[180px] w-full resize-none border border-[#4d5314] bg-[#0d0f05] px-5 py-4 text-sm uppercase tracking-[0.12em] text-[#d5de6b] outline-none transition-colors duration-200 placeholder:text-[#4d5320] focus:border-[#eff84e]"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>TAG_CHANNELS</FieldLabel>
                  <input
                    value={draft.tags}
                    onChange={(event) => onChange("tags", event.target.value)}
                    placeholder="OPS, CLIENT, SECURITY"
                    className="w-full border border-[#4d5314] bg-[#0d0f05] px-5 py-4 text-sm uppercase tracking-[0.16em] text-[#eef76c] outline-none transition-colors duration-200 placeholder:text-[#545a25] focus:border-[#eff84e]"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-6 border-l border-[#25290c] pl-0 lg:pl-6">
                <div className="border border-[#4b5217] bg-[#111406] p-5">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#8a911f]">SYSTEM_PRIORITY_ALERT</p>
                  <p className="mt-5 text-sm uppercase tracking-[0.22em] text-[#eef85d]">SELECT CRITICALITY VECTOR</p>
                  <div className="mt-5 space-y-3">
                    {(["LOW", "MEDIUM", "HIGH"] as const).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => onChange("priority", priority)}
                        className={cn(
                          "flex w-full items-center justify-between border px-4 py-3 text-xs uppercase tracking-[0.28em] transition-colors duration-200",
                          draft.priority === priority
                            ? "border-[#e9f642] bg-[#1c2007] text-[#fbffac]"
                            : "border-[#3e4311] text-[#8f972d] hover:border-[#757d22] hover:text-[#dce45c]"
                        )}
                      >
                        <span>{priority}_PRIORITY</span>
                        <span>{priority === "HIGH" ? "88%" : priority === "MEDIUM" ? "54%" : "21%"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 text-[11px] uppercase tracking-[0.24em] text-[#788023] sm:grid-cols-2 lg:grid-cols-1">
                  <div className="border border-[#2f330f] bg-[#0b0d04] px-4 py-3">
                    <p>LOGIC_PROVIDER: {isAuthBypassed ? "LOCAL_TEST_EVENTS" : "SUPABASE_EVENTS"}</p>
                  </div>
                  <div className="border border-[#2f330f] bg-[#0b0d04] px-4 py-3">
                    <p>WORKER: BACKGROUND_SYNC_ACTIVE</p>
                  </div>
                  <div className="border border-[#2f330f] bg-[#0b0d04] px-4 py-3">
                    <p>BUFFER_STATE: READY</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] uppercase tracking-[0.34em] text-[#6f7522]">
                LOGIC_PROVIDER: {isAuthBypassed ? "LOCAL_TEST_EVENTS // UPLINK_BUFFER: SIMULATED" : "APPNITE_EVENTS // UPLINK_BUFFER: SECURE"}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-[#5b621a] px-6 py-3 text-xs uppercase tracking-[0.28em] text-[#d1d86c] transition-colors duration-200 hover:bg-[#131606]"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 border border-[#eff951] bg-[#edf84a] px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#111304] transition-colors duration-200 hover:bg-[#fbff86] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  COMMIT_TO_TIMELINE
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
export default function CalendarPage() {
  const addLog = useSystemLogStore((state) => state.addLog);
  const tasks = useTaskStore((state) => state.tasks);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<TemporalEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<EventDraft>(() => createDraft(new Date()));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRealtimeLive, setIsRealtimeLive] = useState(false);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLInputElement | null>(null);

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== "completed"), [tasks]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toUpperCase();

    if (!query) {
      return events;
    }

    return events.filter((event) => {
      const haystack = [event.title, event.description ?? "", ...event.tags].join(" ").toUpperCase();
      return haystack.includes(query);
    });
  }, [events, searchQuery]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, TemporalEvent[]>();

    weekDays.forEach((day) => {
      map.set(format(day, "yyyy-MM-dd"), []);
    });

    filteredEvents.forEach((event) => {
      const key = format(parseISO(event.start_timestamp), "yyyy-MM-dd");
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(event);
      }
    });

    return map;
  }, [filteredEvents, weekDays]);

  const totalHoursLogged = useMemo(() => {
    const minutes = events.reduce((accumulator, event) => {
      return accumulator + differenceInMinutes(new Date(event.end_timestamp), new Date(event.start_timestamp));
    }, 0);

    return (minutes / 60).toFixed(1);
  }, [events]);

  const upcomingEvent = useMemo(() => getUpcomingEvent(events, now), [events, now]);
  const upcomingCountdown = useMemo(() => formatCountdown(upcomingEvent, now), [upcomingEvent, now]);

  const fetchEvents = useCallback(async () => {
    setIsSyncing(true);

    if (isAuthBypassed) {
      setEvents(createLocalTestEvents(weekStart));
      setIsSyncing(false);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("id,title,start_timestamp,end_timestamp,priority,tags,description")
      .gte("start_timestamp", startOfDay(weekStart).toISOString())
      .lt("start_timestamp", startOfDay(weekEnd).toISOString())
      .order("start_timestamp", { ascending: true });

    if (error) {
      addLog("TEMPORAL_UPLINK_FAILURE", "error");
      setIsSyncing(false);
      return;
    }

    setEvents((data ?? []).map(normalizeEventRow));
    setIsSyncing(false);
  }, [addLog, weekEnd, weekStart]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (isAuthBypassed) {
      setIsRealtimeLive(true);
      return () => {
        setIsRealtimeLive(false);
      };
    }

    const channel = supabase
      .channel(`temporal-week-${format(weekStart, "yyyyMMdd")}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          setIsRealtimeLive(true);
          void fetchEvents();
        }
      )
      .subscribe((status) => {
        setIsRealtimeLive(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
      setIsRealtimeLive(false);
    };
  }, [fetchEvents, weekStart]);

  const openCreateModal = useCallback((day: Date, preset?: Partial<EventDraft>) => {
    setSelectedDate(day);
    setDraft({ ...createDraft(day), ...preset });
    setIsCreateOpen(true);
    ArkanAudio.playFast("system_engage");
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateOpen(false);
    setDraft(createDraft(selectedDate));
  }, [selectedDate]);

  const handleDraftChange = useCallback((field: keyof EventDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const handleDateSelection = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.value) {
      return;
    }

    const nextDate = new Date(`${event.target.value}T12:00:00`);
    setSelectedDate(nextDate);
    ArkanAudio.playFast("key_tick_mechanical");
  }, []);

  const handleSubmitEvent = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const payload = buildTemporalPayload(draft);

      if (!payload.title) {
        addLog("TEMPORAL_SEQUENCE_REJECTED", "warning");
        ArkanAudio.playFast("system_purge");
        return;
      }

      const optimisticEvent: TemporalEvent = {
        id: `pending-${Date.now()}`,
        title: payload.title,
        start_timestamp: payload.start_timestamp,
        end_timestamp: payload.end_timestamp,
        priority: payload.priority,
        description: payload.description,
        tags: payload.tags,
      };

      setIsSubmitting(true);
      setEvents((current) => sortEvents([...current, optimisticEvent]));
      setIsCreateOpen(false);
      ArkanAudio.playFast("system_execute_clack");

      if (isAuthBypassed) {
        setEvents((current) =>
          sortEvents([
            ...current.filter((item) => item.id !== optimisticEvent.id),
            {
              ...optimisticEvent,
              id: `local-event-${Date.now()}`,
            },
          ])
        );
        setDraft(createDraft(selectedDate));
        setIsSubmitting(false);
        addLog(`LOCAL_TEST_SEQUENCE_COMMITTED:${payload.title}`, "status");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          title: payload.title,
          start_timestamp: payload.start_timestamp,
          end_timestamp: payload.end_timestamp,
          priority: payload.priority,
          description: payload.description ?? null,
          tags: payload.tags,
        })
        .select("id,title,start_timestamp,end_timestamp,priority,tags,description")
        .single();

      if (error) {
        setEvents((current) => current.filter((item) => item.id !== optimisticEvent.id));
        setIsCreateOpen(true);
        setIsSubmitting(false);
        addLog("TEMPORAL_SEQUENCE_COMMIT_FAILED", "error");
        ArkanAudio.playFast("system_purge");
        return;
      }

      setEvents((current) => sortEvents([...current.filter((item) => item.id !== optimisticEvent.id), normalizeEventRow(data)]));
      setDraft(createDraft(selectedDate));
      setIsSubmitting(false);
      addLog(`TEMPORAL_SEQUENCE_COMMITTED:${payload.title}`, "status");
    },
    [addLog, draft, selectedDate]
  );

  const handleTaskDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, day: Date) => {
      event.preventDefault();
      setDragTargetKey(null);

      const taskId = event.dataTransfer.getData("text/plain");
      const task = pendingTasks.find((candidate) => candidate.id === taskId);

      if (!task) {
        return;
      }

      addLog(`TASK_UPLINK_BUFFERED:${task.title}`, "status");
      openCreateModal(day, buildTaskPromotionDraft(task, day, now));
    },
    [addLog, now, openCreateModal, pendingTasks]
  );

  const selectedKey = format(selectedDate, "yyyy-MM-dd");

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050605] text-[#eef75b]">
      <div className="border-b border-[#1d2009] bg-[#080906] px-5 py-4 lg:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-3 border border-[#5a6119] bg-[#101206] px-4 py-3">
              <CalendarDays className="h-4 w-4 text-[#f0fb5e]" />
              <div>
                <p className="text-xl font-semibold uppercase tracking-[0.22em] text-[#f0fb5e]">[{format(weekStart, "MMMM_yyyy").toUpperCase()}]</p>
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#728021]">ARKAN_OS // TEMPORAL_SCHEDULER</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-[#2d310d] bg-[#0d0f05] p-1">
              <button
                type="button"
                className="border border-[#7c8424] bg-[#1c2009] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#eef75b]"
              >
                WEEK
              </button>
              <button
                type="button"
                onClick={() => {
                  addLog("MONTH_MATRIX_PENDING", "status");
                  ArkanAudio.playFast("key_tick_mechanical");
                }}
                className="border border-transparent px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#6e7427] transition-colors duration-200 hover:border-[#4e5415] hover:text-[#c9d55b]"
              >
                MONTH
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                datePickerRef.current?.focus();
                datePickerRef.current?.click();
              }}
              className="inline-flex items-center gap-2 border border-[#727923] bg-[#121406] px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#eef75b] transition-colors duration-200 hover:bg-[#1a1d08]"
            >
              SELECT_DATE
              <CalendarDays className="h-4 w-4" />
            </button>
            <input
              ref={datePickerRef}
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={handleDateSelection}
              className="sr-only"
            />

            <button
              type="button"
              onClick={() => {
                void fetchEvents();
                ArkanAudio.playFast("system_engage");
              }}
              className="inline-flex items-center gap-2 border border-[#4d5314] bg-[#0c0e05] px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#cfd86c] transition-colors duration-200 hover:border-[#808927] hover:text-[#eef75b]"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              REFRESH
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3 border border-[#23270c] bg-[#0c0e05] px-4 py-3 text-[11px] uppercase tracking-[0.26em] text-[#dce469]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#eef74f] shadow-[0_0_12px_rgba(238,247,79,0.66)]" />
              SYSTEM_STABLE
              <span className="text-[#747c24]">SYNC: {isRealtimeLive ? "ONLINE" : "STANDBY"}</span>
            </div>
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c7228]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="QUERY_ARCHIVE_DATA..."
                className="w-full border border-[#23270c] bg-[#0c0e05] py-3 pl-11 pr-4 text-[11px] uppercase tracking-[0.26em] text-[#eef75b] outline-none transition-colors duration-200 placeholder:text-[#565c22] focus:border-[#eef75b]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-5 overflow-hidden px-5 py-5 lg:px-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-0 flex-col overflow-hidden border border-[#1c1f09] bg-[radial-gradient(circle_at_top,rgba(238,247,91,0.05),transparent_32%),linear-gradient(180deg,rgba(10,11,6,0.97),rgba(5,6,4,0.98))]">
          <div className="grid grid-cols-2 border-b border-[#1d210a] md:grid-cols-4 xl:grid-cols-7">
            {weekDays.map((day) => (
              <button
                key={format(day, "yyyy-MM-dd")}
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                  ArkanAudio.playFast("key_tick_mechanical");
                }}
                className={cn(
                  "border-r border-[#191c09] px-4 py-4 text-left transition-colors duration-200 last:border-r-0",
                  isSameDay(day, selectedDate) ? "bg-[#181b08]" : "hover:bg-[#101205]"
                )}
              >
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#6f7424]">{format(day, "EEE")}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn("text-2xl font-semibold tracking-[0.14em]", isSameDay(day, selectedDate) ? "text-[#f0fb5e]" : "text-[#9aa234]")}>{format(day, "dd")}</span>
                  {isToday(day) ? <span className="h-2.5 w-2.5 rounded-full bg-[#eef74f] shadow-[0_0_12px_rgba(238,247,79,0.66)]" /> : null}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-[#1d210a] px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#8b932b]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate((current) => subWeeks(current, 1));
                  ArkanAudio.playFast("key_tick_mechanical");
                }}
                className="border border-[#404614] p-2 text-[#dce469] transition-colors duration-200 hover:border-[#7c8424]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(new Date());
                  ArkanAudio.playFast("key_tick_mechanical");
                }}
                className="border border-[#404614] px-4 py-2 transition-colors duration-200 hover:border-[#7c8424]"
              >
                CURRENT_WEEK
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate((current) => addWeeks(current, 1));
                  ArkanAudio.playFast("key_tick_mechanical");
                }}
                className="border border-[#404614] p-2 text-[#dce469] transition-colors duration-200 hover:border-[#7c8424]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span>WEEK_SPAN // {format(weekStart, "dd MMM")} - {format(addDays(weekEnd, -1), "dd MMM")}</span>
              <span className="text-[#eef75b]">{isSyncing ? "CALENDAR_UPLINK_SYNCING" : "TEMPORAL_CHRONOLOGY"}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid min-h-full grid-cols-1 gap-3 p-4 xl:grid-cols-7">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                return (
                  <TemporalDayColumn
                    key={key}
                    day={day}
                    events={eventsByDay.get(key) ?? []}
                    isActive={key === selectedKey}
                    isDropTarget={dragTargetKey === key}
                    searchQuery={searchQuery}
                    onActivate={setSelectedDate}
                    onCreate={openCreateModal}
                    onTaskDrop={handleTaskDrop}
                    onTaskDragEnter={(dropDay) => setDragTargetKey(format(dropDay, "yyyy-MM-dd"))}
                    onTaskDragLeave={() => setDragTargetKey(null)}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#1d210a] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border border-[#23270c] bg-[#090a04] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#7a8127]">TASK_UPLINK_QUEUE</p>
                  <h3 className="mt-2 text-sm uppercase tracking-[0.22em] text-[#eef75b]">DRAG TASKS INTO A DAY TO PREFILL A SEQUENCE</h3>
                </div>
                <Grip className="h-4 w-4 text-[#707723]" />
              </div>
              <div className="flex flex-wrap gap-3">
                {pendingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task.id);
                      ArkanAudio.playFast("key_tick_mechanical");
                    }}
                    className="border border-[#3a3f12] bg-[#111306] px-4 py-3 text-left transition-colors duration-200 hover:border-[#7d8426] hover:text-[#f3fb7c]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#788122]">{task.category ?? "TASK"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#dce566]">{task.title}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="border border-[#23270c] bg-[#090a04] p-4">
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#788122]">TOTAL_HOURS_LOGGED</p>
                <p className="mt-3 text-3xl font-semibold tracking-[0.14em] text-[#f0fb5e]">{totalHoursLogged}<span className="ml-2 text-sm text-[#7d8426]">HRS</span></p>
              </div>
              <div className="border border-[#23270c] bg-[#090a04] p-4">
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#788122]">SYNC_STATUS</p>
                <p className="mt-3 text-base uppercase tracking-[0.22em] text-[#eef75b]">
                  {isSyncing ? "SUPABASE_CALENDAR_UPLINK // SYNCING" : "SUPABASE_CALENDAR_UPLINK // STABLE"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-4">
          <button
            type="button"
            onClick={() => openCreateModal(selectedDate)}
            className="inline-flex items-center justify-center gap-2 border border-[#ecf650] bg-[#eef94f] px-5 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#101305] transition-colors duration-200 hover:bg-[#fbff8c]"
          >
            <Plus className="h-4 w-4" />
            + INITIALIZE_EVENT
          </button>

          <div className="border border-[#6d7420] bg-[#0c0e05] p-5 shadow-[0_0_22px_rgba(237,248,68,0.08)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#33380f] pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#7d8426]">SYSTEM_PRIORITY_ALERT</p>
                <h3 className="mt-3 text-lg font-semibold uppercase tracking-[0.18em] text-[#eff85b]">UPCOMING_EVENT</h3>
              </div>
              <ShieldAlert className="h-5 w-5 text-[#eff85b]" />
            </div>

            {upcomingEvent ? (
              <div className="space-y-5 pt-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#687022]">TYPE: {upcomingEvent.priority}_EVENT_TRIGGER</p>
                  <p className="mt-3 text-xl font-semibold uppercase tracking-[0.16em] text-[#f6ff88]">{upcomingEvent.title}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="border border-[#34390f] bg-[#101205] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[#788022]">INITIALIZING_IN</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[0.14em] text-[#eef85b]">{upcomingCountdown}</p>
                  </div>
                  <div className="border border-[#34390f] bg-[#101205] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[#788022]">EVENT_WINDOW</p>
                    <p className="mt-2 text-lg font-semibold uppercase tracking-[0.16em] text-[#eef85b]">{formatRange(upcomingEvent)}</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden bg-[#1f2308]">
                  <div className="h-full bg-[#eef85b]" style={{ width: upcomingEvent.priority === "HIGH" ? "88%" : upcomingEvent.priority === "MEDIUM" ? "64%" : "38%" }} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(parseISO(upcomingEvent.start_timestamp));
                      ArkanAudio.playFast("system_engage");
                    }}
                    className="border border-[#555d17] px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-[#d7df71] transition-colors duration-200 hover:bg-[#151806]"
                  >
                    ACKNOWLEDGE
                  </button>
                  <button
                    type="button"
                    onClick={() => openCreateModal(parseISO(upcomingEvent.start_timestamp), {
                      title: `${upcomingEvent.title}_FOLLOWUP`,
                      description: upcomingEvent.description ?? "",
                      tags: upcomingEvent.tags.join(", "),
                      priority: upcomingEvent.priority,
                    })}
                    className="border border-[#e7f33d] bg-[#eef84e] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#101305] transition-colors duration-200 hover:bg-[#fbff8c]"
                  >
                    OPEN_MODULE
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-5">
                <p className="text-sm uppercase tracking-[0.24em] text-[#98a03b]">NO_CRITICAL_EVENT_IN_QUEUE</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="border border-[#23270c] bg-[#090a04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#778022]">SYNC_COMPLETE</p>
                  <p className="mt-3 text-sm uppercase tracking-[0.22em] text-[#e7f35a]">UPLINK: {isRealtimeLive ? "STABLE" : "STANDBY"}</p>
                </div>
                {isSyncing ? <LoaderCircle className="h-5 w-5 animate-spin text-[#eef85b]" /> : <Settings2 className="h-5 w-5 text-[#697121]" />}
              </div>
            </div>
            <div className="border border-[#23270c] bg-[#090a04] p-5">
              <p className="text-[10px] uppercase tracking-[0.34em] text-[#778022]">TEMPORAL_CLOCK</p>
              <p className="mt-3 text-3xl font-semibold tracking-[0.14em] text-[#f0fb5e]">{format(now, "HH:mm:ss")}</p>
            </div>
          </div>

          <div className="flex-1 border border-[#23270c] bg-[#090a04] p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#23270c] pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#778022]">SYS_LOGS</p>
                <h3 className="mt-2 text-sm uppercase tracking-[0.22em] text-[#eef75b]">TEMPORAL_CHRONOLOGY</h3>
              </div>
              <Clock3 className="h-4 w-4 text-[#707823]" />
            </div>
            <div className="space-y-3 text-[11px] uppercase tracking-[0.22em] text-[#9da63b]">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="border border-[#272b0d] bg-[#0d0f05] px-4 py-3">
                  <p className="text-[#eef75b]">[{format(parseISO(event.start_timestamp), "EEE dd HH:mm")}] {event.title}</p>
                  <p className="mt-2 text-[#697121]">{event.tags.join(", ") || "TEMPORAL_SIGNAL"}</p>
                </div>
              ))}
              {!events.length ? <p className="text-[#687022]">NO_EVENTS_IN_CURRENT_WEEK</p> : null}
            </div>
          </div>
        </aside>
      </div>

      <div className="border-t border-[#1d2009] bg-[#060704] px-5 py-3 text-[11px] uppercase tracking-[0.26em] text-[#748022] lg:px-7">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-[#8a922d]">
            <span className="text-[#eef75b]">TOTAL_HOURS_LOGGED: {totalHoursLogged}H</span>
            <span>SYNC_STATUS: {isSyncing ? "UPLINK_SYNCING" : isRealtimeLive ? "SUPABASE_CALENDAR_UPLINK" : "UPLINK_STANDBY"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>SYS_LOGS</span>
            <span>PRIVACY_MD</span>
            <span>SECURITY_AUTH</span>
            <span className="text-[#59601b]">ARKAN_OS v2.8.4 // TEMPORAL_CHRONOLOGY_SCHEDULER</span>
          </div>
        </div>
      </div>

      <CreateEventModal
        isOpen={isCreateOpen}
        draft={draft}
        isSubmitting={isSubmitting}
        onClose={closeCreateModal}
        onChange={handleDraftChange}
        onSubmit={handleSubmitEvent}
      />
    </div>
  );
}


