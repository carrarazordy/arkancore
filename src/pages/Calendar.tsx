import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  parseISO,
  differenceInMinutes,
  setHours,
  setMinutes,
  startOfDay,
  addMinutes
} from "date-fns";
import { 
  Terminal, 
  Calendar as CalendarIcon, 
  PlusSquare as PlusBox, 
  Search, 
  Filter, 
  ChevronDown,
  Cpu,
  Zap,
  RefreshCw as Sync, 
  User as Person,
  Settings,
  Activity,
  Network,
  Clock,
  Plus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { useDialogStore } from "@/store/useDialogStore";
import { useTaskStore } from "@/store/useTaskStore";
import { motion, AnimatePresence } from "framer-motion";

interface TemporalEvent {
  id: string;
  title: string;
  start_timestamp: string;
  end_timestamp: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  tags?: string[];
  description?: string;
}

const ROW_HEIGHT = 60; // 1 hour = 60px
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeWeek, setActiveWeek] = useState<any[]>([]);
  const [events, setEvents] = useState<TemporalEvent[]>([]);
  const [isMatrixViewOpen, setIsMatrixViewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { openDialog } = useDialogStore();
  const { tasks, updateTask } = useTaskStore();
  const addLog = useSystemLogStore((state) => state.addLog);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Weekly Grid Generation
  const initializeWeek = useCallback((targetDate: Date) => {
    const start = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday start
    const week = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        id: `DAY_NODE_${i}`,
        label: format(date, "eee").toUpperCase(),
        numeric: format(date, "dd"),
        isToday: isToday(date),
        fullDate: date
      };
    });
    setActiveWeek(week);
  }, []);

  useEffect(() => {
    initializeWeek(selectedDate);
  }, [selectedDate, initializeWeek]);

  // 2. Data Fetching
  const fetchEvents = useCallback(async () => {
    if (activeWeek.length === 0) return;
    const start = startOfDay(activeWeek[0].fullDate).toISOString();
    const end = addDays(startOfDay(activeWeek[6].fullDate), 1).toISOString();

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("start_timestamp", start)
      .lte("start_timestamp", end)
      .order("start_timestamp", { ascending: true });

    if (error) {
      addLog(`TEMPORAL_QUERY_ERROR: ${error.message}`, "error");
      return;
    }

    setEvents(data || []);
  }, [activeWeek, addLog]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("calendar_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      scrollContainerRef.current.scrollTop = Math.max(0, (currentHour * ROW_HEIGHT) - 100);
    }
  }, []);

  const handleAddEvent = (date: Date, hour: number) => {
    ArkanAudio.playFast("ui_confirm_ping");
    const startTime = setHours(setMinutes(date, 0), hour);
    
    openDialog({
      title: "INIT_TEMPORAL_NODE",
      placeholder: "EVENT_TITLE // DURATION_MIN",
      confirmLabel: "EXECUTE_COMMIT",
      onConfirm: async (val) => {
        if (!val) return;
        const [title, durationStr] = val.split("//").map(s => s.trim());
        const duration = parseInt(durationStr) || 60;
        const end = addMinutes(startTime, duration);

        const { error } = await supabase.from("events").insert({
          title: title || "UNTITLED_NODE",
          start_timestamp: startTime.toISOString(),
          end_timestamp: end.toISOString(),
          priority: "MEDIUM"
        });

        if (error) addLog(`COMMIT_FAILED: ${error.message}`, "error");
        else addLog("TEMPORAL_NODE_COMMITTED", "system");
      }
    });
  };

  const onTaskDropToTimeline = async (taskId: string, date: Date, hour: number) => {
    addLog(`>> RE-SCHEDULING_TASK: ${taskId} TO ${format(date, 'yyyy-MM-dd')} @ ${hour}:00`, "system");
    ArkanAudio.playFast('system_execute_clack');

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const startTime = setHours(setMinutes(date, 0), hour);
    const endTime = addMinutes(startTime, 60);

    // Promote task to event
    const { error } = await supabase.from("events").insert({
      title: task.title,
      start_timestamp: startTime.toISOString(),
      end_timestamp: endTime.toISOString(),
      priority: task.priority === 'critical' ? 'HIGH' : task.priority === 'high' ? 'MEDIUM' : 'LOW',
      description: task.description
    });

    if (error) {
      addLog(`PROMOTION_FAILED: ${error.message}`, "error");
    } else {
      // Mark task as completed or delete it from inbox
      await updateTask(taskId, { status: 'completed' });
      addLog("TASK_PROMOTED_TO_TEMPORAL_NODE", "system");
    }
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(parseISO(e.start_timestamp), date));
  };

  const calculatePosition = (timestamp: string) => {
    const date = parseISO(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return (hours * ROW_HEIGHT) + (minutes / 60 * ROW_HEIGHT);
  };

  const calculateHeight = (start: string, end: string) => {
    const diff = differenceInMinutes(parseISO(end), parseISO(start));
    return (diff / 60) * ROW_HEIGHT;
  };

  return (
    <div className="flex flex-col h-full bg-black text-primary font-mono selection:bg-primary selection:text-black overflow-hidden relative">
      {/* Main Tactical Grid */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Day Headers */}
        <div className="grid grid-cols-[60px_1fr] border-b border-primary/20 bg-black/80">
          <div className="border-r border-primary/20 flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary/20" />
          </div>
          <div className="grid grid-cols-7">
            {activeWeek.map((day) => (
              <div 
                key={day.id}
                className={cn(
                  "p-3 border-r border-primary/10 flex flex-col items-center justify-center gap-1 transition-all",
                  day.isToday ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <span className={cn(
                  "text-[10px] font-bold tracking-widest",
                  day.isToday ? "text-primary neon-text" : "text-primary/40"
                )}>
                  {day.label}
                </span>
                <span className={cn(
                  "text-lg font-black",
                  day.isToday ? "text-primary" : "text-primary/60"
                )}>
                  {day.numeric}
                </span>
                {day.isToday && (
                  <span className="text-[8px] font-bold text-primary animate-pulse">[ACTIVE]</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar relative"
        >
          <div className="grid grid-cols-[60px_1fr] min-h-full">
            {/* Time Column */}
            <div className="border-r border-primary/20 bg-black/40">
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  style={{ height: ROW_HEIGHT }}
                  className="border-b border-primary/5 px-2 flex items-start justify-end pt-1"
                >
                  <span className="text-[9px] font-mono text-primary/30 tabular-nums">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Grid Columns */}
            <div className="grid grid-cols-7 relative">
              {/* Horizontal Hour Lines */}
              <div className="absolute inset-0 pointer-events-none">
                {HOURS.map(hour => (
                  <div 
                    key={hour} 
                    style={{ top: hour * ROW_HEIGHT }}
                    className="absolute w-full h-px bg-primary/5"
                  />
                ))}
              </div>

              {/* Vertical Day Columns */}
              {activeWeek.map((day, dayIdx) => (
                <div 
                  key={day.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData("taskId");
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const hour = Math.floor(y / ROW_HEIGHT);
                    onTaskDropToTimeline(taskId, day.fullDate, hour);
                  }}
                  className={cn(
                    "relative border-r border-primary/5 group",
                    day.isToday && "bg-primary/[0.02]"
                  )}
                  style={{ height: HOURS.length * ROW_HEIGHT }}
                >
                  {/* Invisible Add Buttons */}
                  {HOURS.map(hour => (
                    <button
                      key={hour}
                      onClick={() => handleAddEvent(day.fullDate, hour)}
                      className="absolute w-full opacity-0 group-hover:opacity-100 hover:bg-primary/5 transition-opacity flex items-center justify-center"
                      style={{ top: hour * ROW_HEIGHT, height: ROW_HEIGHT }}
                    >
                      <Plus className="h-4 w-4 text-primary/20" />
                    </button>
                  ))}

                  {/* Events */}
                  {getEventsForDay(day.fullDate).map(event => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => {
                        ArkanAudio.playFast("system_execute_clack");
                        addLog(`ACCESSING_TEMPORAL_NODE: ${event.id}`, "system");
                      }}
                      className={cn(
                        "absolute left-1 right-1 p-2 border rounded-sm cursor-pointer transition-all overflow-hidden z-20",
                        event.priority === "HIGH" 
                          ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(255,255,0,0.3)]" 
                          : "bg-black/80 border-primary/30 hover:border-primary hover:bg-primary/10"
                      )}
                      style={{ 
                        top: calculatePosition(event.start_timestamp),
                        height: calculateHeight(event.start_timestamp, event.end_timestamp)
                      }}
                    >
                      <div className={cn(
                        "text-[8px] font-bold mb-0.5 uppercase truncate",
                        event.priority === "HIGH" ? "text-black/60" : "text-primary/40"
                      )}>
                        {format(parseISO(event.start_timestamp), "HH:mm")} - {format(parseISO(event.end_timestamp), "HH:mm")}
                      </div>
                      <div className={cn(
                        "text-[10px] font-black uppercase leading-tight line-clamp-2",
                        event.priority === "HIGH" ? "text-black" : "text-primary"
                      )}>
                        {event.title}
                      </div>
                    </motion.div>
                  ))}

                  {/* Current Time Indicator */}
                  {day.isToday && (
                    <div 
                      className="absolute w-full h-px bg-red-500 z-30 flex items-center"
                      style={{ top: calculatePosition(new Date().toISOString()) }}
                    >
                      <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shadow-[0_0_8px_#ff0000]"></div>
                      <div className="ml-2 px-1 bg-red-500 text-white text-[8px] font-bold rounded">NOW</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
