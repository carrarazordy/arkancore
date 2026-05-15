import type { ArchiveNode } from "@/store/useNoteStore";

export type NotesBackupPayload = {
  format: "ARKAN_NOTES_BACKUP_V1";
  exportedAt: string;
  selectedNodeId: string | null;
  nodes: Array<Omit<ArchiveNode, "updatedAt"> & { updatedAt: string }>;
};

function normalizeDate(value: ArchiveNode["updatedAt"]) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeHeading(value: string) {
  return value.replace(/\s+/g, " ").trim() || "UNTITLED";
}

function appendNodeMarkdown(node: ArchiveNode, nodes: ArchiveNode[], depth: number, lines: string[]) {
  const headingDepth = Math.min(depth + 1, 6);
  const marker = "#".repeat(headingDepth);
  lines.push(`${marker} ${normalizeHeading(node.title)}`);
  lines.push("");

  if (node.type === "note") {
    lines.push(node.content?.trim() || "_EMPTY_NOTE_");
    lines.push("");
  }

  nodes
    .filter((candidate) => candidate.parentId === node.id)
    .sort((left, right) => left.title.localeCompare(right.title))
    .forEach((child) => appendNodeMarkdown(child, nodes, depth + 1, lines));
}

export function buildNotesBackup(nodes: ArchiveNode[], selectedNodeId: string | null): NotesBackupPayload {
  return {
    format: "ARKAN_NOTES_BACKUP_V1",
    exportedAt: new Date().toISOString(),
    selectedNodeId,
    nodes: nodes.map((node) => ({
      ...node,
      updatedAt: normalizeDate(node.updatedAt),
    })),
  };
}

export function buildNotesMarkdown(nodes: ArchiveNode[]) {
  const lines = ["# ARKAN_NOTES_EXPORT", ""];

  nodes
    .filter((node) => node.parentId === null)
    .sort((left, right) => left.title.localeCompare(right.title))
    .forEach((node) => appendNodeMarkdown(node, nodes, 1, lines));

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function buildSelectedNoteMarkdown(node: ArchiveNode | undefined) {
  if (!node || node.type !== "note") {
    return "";
  }

  const content = node.content?.trim();
  if (content) {
    return `${content}\n`;
  }

  return `# ${normalizeHeading(node.title)}\n`;
}
