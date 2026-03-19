import { addMinutes, format, isAfter, setHours, setMinutes } from "date-fns";
import type { Task } from "@/store/useTaskStore";

export interface TemporalEvent {
  id: string;
  title: string;
  start_timestamp: string;
  end_timestamp: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  tags: string[];
  description?: string;
}

export interface EventDraft {
  title: string;
  date: string;
  time: string;
  duration: string;
  description: string;
  tags: string;
  priority: TemporalEvent["priority"];
}

export const DURATION_OPTIONS = [30, 60, 90, 120];

export function buildEventKey(event: Pick<TemporalEvent, "title" | "start_timestamp" | "end_timestamp">) {
  return `${event.title}|${event.start_timestamp}|${event.end_timestamp}`;
}

export function mergeEvents(existing: TemporalEvent[], incoming: TemporalEvent[]) {
  const map = new Map<string, TemporalEvent>();

  [...existing, ...incoming].forEach((event) => {
    map.set(buildEventKey(event), event);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.start_timestamp).getTime() - new Date(b.start_timestamp).getTime()
  );
}

export function createDraft(date: Date): EventDraft {
  return {
    title: "",
    date: format(date, "yyyy-MM-dd"),
    time: "09:00",
    duration: "60",
    description: "",
    tags: "",
    priority: "MEDIUM",
  };
}

export function buildTemporalPayload(draft: EventDraft) {
  const [hours, minutes] = draft.time.split(":").map((value) => parseInt(value, 10));
  const eventDate = new Date(`${draft.date}T00:00:00`);
  const start = setHours(setMinutes(eventDate, minutes), hours);
  const end = addMinutes(start, parseInt(draft.duration, 10));
  const tags = draft.tags
    .split(",")
    .map((tag) => tag.trim().toUpperCase())
    .filter(Boolean);

  return {
    title: draft.title.trim().toUpperCase(),
    start_timestamp: start.toISOString(),
    end_timestamp: end.toISOString(),
    priority: draft.priority,
    description: draft.description.trim() || undefined,
    tags,
  };
}

export function buildTaskPromotionDraft(task: Task, date: Date, referenceNow: Date = new Date()): EventDraft {
  const defaultHour = referenceNow.toDateString() === date.toDateString()
    ? Math.min(18, Math.max(referenceNow.getHours() + 1, 9))
    : 9;

  return {
    title: task.title,
    date: format(date, "yyyy-MM-dd"),
    time: `${defaultHour.toString().padStart(2, "0")}:00`,
    duration: "60",
    description: task.description ?? "",
    tags: task.tags?.join(", ") || (task.priority ? task.priority.toUpperCase() : "TASK"),
    priority: task.priority === "critical" ? "HIGH" : task.priority === "high" ? "MEDIUM" : "LOW",
  };
}

export function getUpcomingEvent(events: TemporalEvent[], referenceNow: Date) {
  return events
    .filter((event) => isAfter(new Date(event.start_timestamp), referenceNow))
    .sort((a, b) => new Date(a.start_timestamp).getTime() - new Date(b.start_timestamp).getTime())[0] ?? null;
}
