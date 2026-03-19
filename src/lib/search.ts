import type { Project } from "@/store/useProjectStore";
import type { Task } from "@/store/useTaskStore";
import type { ArchiveNode } from "@/store/useNoteStore";
import type { Log } from "@/store/useSystemLogStore";

export type SearchSource = "TASKS_ARCHIVE" | "NEURAL_NOTES" | "CORE_PROJECTS" | "LEGACY_COMMS";
export type SearchPriority = "CRITICAL" | "HIGH_VAL" | "STANDARD" | "ARCHIVED";

export interface SearchDocument {
  id: string;
  technicalId: string;
  title: string;
  content: string;
  source: SearchSource;
  priority: SearchPriority;
  route: string;
  breadcrumb: string[];
  tags: string[];
  updatedAt: string;
  status: string;
}

export interface SearchMatch extends SearchDocument {
  score: number;
  snippet: string;
  matchedTerms: string[];
}

export interface SearchFilters {
  sources?: SearchSource[];
  priority?: SearchPriority | "ALL";
  from?: string;
  to?: string;
  limit?: number;
}

interface SearchBuildInput {
  projects: Project[];
  tasks: Task[];
  notes: ArchiveNode[];
  logs: Log[];
}

const PRIORITY_SCORE: Record<SearchPriority, number> = {
  CRITICAL: 120,
  HIGH_VAL: 80,
  STANDARD: 40,
  ARCHIVED: 10,
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").trim();
}

function toIso(value: Date | string | undefined) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function tokenize(query: string) {
  return normalize(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function buildSnippet(content: string, terms: string[]) {
  if (!content.trim()) return "";

  if (!terms.length) {
    return content.slice(0, 180).trim();
  }

  const normalizedContent = normalize(content);
  const firstHit = terms
    .map((term) => normalizedContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstHit === undefined) {
    return content.slice(0, 180).trim();
  }

  const start = Math.max(0, firstHit - 64);
  const end = Math.min(content.length, start + 220);
  const snippet = content.slice(start, end).trim();
  return start > 0 ? `...${snippet}` : snippet;
}

function inferTaskPriority(task: Task): SearchPriority {
  const priority = task.priority?.toLowerCase();
  const status = task.status?.toLowerCase();

  if (status === "archived") return "ARCHIVED";
  if (priority === "critical") return "CRITICAL";
  if (priority === "high") return "HIGH_VAL";
  return "STANDARD";
}

function inferProjectPriority(project: Project): SearchPriority {
  if ((project.status ?? "").toLowerCase() === "archived") return "ARCHIVED";
  if (project.progress >= 70) return "HIGH_VAL";
  return "STANDARD";
}

function inferLogPriority(log: Log): SearchPriority {
  if (log.type === "error") return "CRITICAL";
  if (log.type === "status") return "HIGH_VAL";
  return "STANDARD";
}

function scoreDocument(document: SearchDocument, terms: string[]) {
  const haystack = normalize([
    document.title,
    document.content,
    document.breadcrumb.join(" "),
    document.tags.join(" "),
    document.technicalId,
    document.status,
  ].join(" "));

  if (!terms.length) {
    return PRIORITY_SCORE[document.priority];
  }

  let score = PRIORITY_SCORE[document.priority];
  let matchedTerms = 0;

  terms.forEach((term) => {
    if (!haystack.includes(term)) return;

    matchedTerms += 1;
    score += 14;

    if (normalize(document.title).includes(term)) {
      score += 28;
    }

    if (normalize(document.technicalId).includes(term)) {
      score += 12;
    }

    const contentMatches = haystack.split(term).length - 1;
    score += Math.min(contentMatches * 4, 20);
  });

  return matchedTerms === terms.length ? score + 18 : -1;
}

function applyFilters(document: SearchDocument, filters: SearchFilters) {
  if (filters.sources?.length && !filters.sources.includes(document.source)) {
    return false;
  }

  if (filters.priority && filters.priority !== "ALL" && document.priority !== filters.priority) {
    return false;
  }

  const timestamp = new Date(document.updatedAt).getTime();

  if (filters.from) {
    const from = new Date(filters.from).getTime();
    if (!Number.isNaN(from) && timestamp < from) return false;
  }

  if (filters.to) {
    const to = new Date(filters.to).getTime();
    if (!Number.isNaN(to) && timestamp > to) return false;
  }

  return true;
}

export function buildSearchDocuments({ projects, tasks, notes, logs }: SearchBuildInput): SearchDocument[] {
  const noteMap = new Map(notes.map((node) => [node.id, node]));

  const noteBreadcrumb = (node: ArchiveNode) => {
    const trail: string[] = [];
    let cursor: ArchiveNode | undefined = node;

    while (cursor) {
      trail.unshift(cursor.title);
      cursor = cursor.parentId ? noteMap.get(cursor.parentId) : undefined;
    }

    return ["NEURAL_ARCHIVE", ...trail].slice(-4);
  };

  const projectDocs = projects.map<SearchDocument>((project) => ({
    id: project.id,
    technicalId: project.technicalId,
    title: project.name.toUpperCase(),
    content: `${project.description ?? "No project briefing available."} Progress ${project.progress}%`,
    source: "CORE_PROJECTS",
    priority: inferProjectPriority(project),
    route: "/dashboard",
    breadcrumb: ["CORE_PROJECTS", "INITIATIVES", project.technicalId],
    tags: [project.status ?? "ACTIVE", `PROGRESS_${project.progress}`],
    updatedAt: new Date().toISOString(),
    status: project.status?.toUpperCase() ?? (project.progress >= 100 ? "COMPLETED" : "IN_PROGRESS"),
  }));

  const taskDocs = tasks.map<SearchDocument>((task, index) => ({
    id: task.id,
    technicalId: `TSK-${String(index + 1).padStart(3, "0")}`,
    title: task.title.toUpperCase(),
    content: `${task.description ?? "No task description available."} Status ${task.status}.`,
    source: "TASKS_ARCHIVE",
    priority: inferTaskPriority(task),
    route: "/operations",
    breadcrumb: ["TASKS_ARCHIVE", task.projectId ? task.projectId.toUpperCase() : "UNSCOPED"],
    tags: [task.status?.toUpperCase() ?? "OPEN", task.priority?.toUpperCase() ?? "STANDARD"],
    updatedAt: toIso(task.updatedAt),
    status: task.status?.toUpperCase() ?? "OPEN",
  }));

  const noteDocs = notes
    .filter((node) => node.type === "note")
    .map<SearchDocument>((note) => ({
      id: note.id,
      technicalId: note.technicalId,
      title: note.title.toUpperCase(),
      content: note.content ?? "",
      source: "NEURAL_NOTES",
      priority: "HIGH_VAL",
      route: "/notes",
      breadcrumb: noteBreadcrumb(note),
      tags: [note.type.toUpperCase()],
      updatedAt: toIso(note.updatedAt),
      status: "INDEXED",
    }));

  const logDocs = logs.map<SearchDocument>((log, index) => ({
    id: log.id,
    technicalId: `LOG-${String(index + 1).padStart(3, "0")}`,
    title: log.message.replace(/_/g, " ").toUpperCase(),
    content: `${log.type} event recorded at ${log.timestamp}.`,
    source: "LEGACY_COMMS",
    priority: inferLogPriority(log),
    route: "/archive",
    breadcrumb: ["LEGACY_COMMS", log.type.toUpperCase()],
    tags: [log.type.toUpperCase()],
    updatedAt: new Date().toISOString(),
    status: log.type.toUpperCase(),
  }));

  return [...projectDocs, ...taskDocs, ...noteDocs, ...logDocs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function searchDocuments(documents: SearchDocument[], query: string, filters: SearchFilters = {}) {
  const terms = tokenize(query);

  const results = documents
    .filter((document) => applyFilters(document, filters))
    .map<SearchMatch | null>((document) => {
      const score = scoreDocument(document, terms);
      if (score < 0) return null;

      return {
        ...document,
        score,
        snippet: buildSnippet(document.content, terms),
        matchedTerms: terms,
      };
    })
    .filter((result): result is SearchMatch => Boolean(result))
    .sort((a, b) => b.score - a.score || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return typeof filters.limit === "number" ? results.slice(0, filters.limit) : results;
}

