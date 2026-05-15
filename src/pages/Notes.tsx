
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNoteStore, ArchiveNode } from '@/store/useNoteStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useSystemLogStore } from '@/store/useSystemLogStore';
import { useHardwareMetrics } from '@/store/useHardwareMetrics';
import { useChronosStore } from '@/store/useChronosStore';
import { ArkanAudio } from '@/lib/audio/ArkanAudio';
import { cn } from '@/lib/utils';
import { buildNotesBackup, buildNotesMarkdown, buildSelectedNoteMarkdown } from '@/lib/notesExport';
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  CheckSquare as TaskAlt,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Copy,
  Cpu,
  Database,
  Download,
  FileArchive,
  FileSearch,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

const LINE_HEIGHT = 24;
const FONT_SIZE = 14;
const PADDING_V = 60;
const PADDING_H = 72;
const GENERIC_NOTE_TITLES = new Set(['NEW_ENTRY', 'UNTITLED_NOTE']);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTextIndexFromPosition(lines: string[], line: number, char: number) {
  let index = 0;
  for (let i = 0; i < line; i += 1) {
    index += (lines[i] ?? '').length + 1;
  }
  return index + char;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'arkan-notes';
}

function triggerDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatRuntime(startedAt: number) {
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function matchesDirectoryQuery(node: ArchiveNode, nodes: ArchiveNode[], query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = `${node.title} ${node.technicalId}`.toLowerCase();
  if (haystack.includes(query)) {
    return true;
  }

  return nodes
    .filter((candidate) => candidate.parentId === node.id)
    .some((child) => matchesDirectoryQuery(child, nodes, query));
}

function renderInlineContent(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        const content = segment.slice(2, -2);
        return (
          <React.Fragment key={`bold-${index}`}>
            <span className="md-marker">**</span>
            <span className="md-bold">{content}</span>
            <span className="md-marker">**</span>
          </React.Fragment>
        );
      }

      if (segment.startsWith('`') && segment.endsWith('`')) {
        const content = segment.slice(1, -1);
        return (
          <React.Fragment key={`code-${index}`}>
            <span className="md-marker">`</span>
            <span className="md-inline-code">{content}</span>
            <span className="md-marker">`</span>
          </React.Fragment>
        );
      }

      return <React.Fragment key={`text-${index}`}>{segment}</React.Fragment>;
    });
}

function renderCodeTokens(line: string) {
  if (!line) {
    return <span className="text-white/20"> </span>;
  }

  let hasCommand = false;

  return line.split(/(\s+)/).filter(Boolean).map((chunk, index) => {
    if (/^\s+$/.test(chunk)) {
      return <span key={`space-${index}`}>{chunk}</span>;
    }

    let className = 'text-white/65';

    if (!hasCommand) {
      className = 'text-[#45d1ff]';
      hasCommand = true;
    } else if (/^--/.test(chunk)) {
      className = 'text-primary/75';
    } else if (/^".*"$|^'.*'$/.test(chunk)) {
      className = 'text-emerald-300/80';
    } else if (/^\d+(\.\d+)?$/.test(chunk)) {
      className = 'text-primary';
    } else if (/^[A-Z_][A-Z0-9_-]*$/.test(chunk)) {
      className = 'text-primary/60';
    }

    return (
      <span key={`token-${index}`} className={className}>
        {chunk}
      </span>
    );
  });
}

function formatNoteTitleCandidate(value: string) {
  return value
    .replace(/[`*_#>\[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}

function deriveNoteTitle(content: string, currentTitle: string) {
  const normalizedContent = content.replace(/\r\n?/g, '\n');
  const lines = normalizedContent.split('\n');
  const headingLine = lines.find((line) => /^#\s+/.test(line.trim()));

  if (headingLine) {
    const nextTitle = formatNoteTitleCandidate(headingLine.trim().replace(/^#\s+/, ''));
    return nextTitle || currentTitle;
  }

  if (!GENERIC_NOTE_TITLES.has(currentTitle)) {
    return currentTitle;
  }

  const fallbackLine = lines.find((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('- ') && !trimmed.startsWith('>') && !trimmed.startsWith('#');
  });

  if (!fallbackLine) {
    return currentTitle;
  }

  return formatNoteTitleCandidate(fallbackLine) || currentTitle;
}

function refineNoteContent(content: string) {
  const normalizedContent = content.replace(/\r\n?/g, '\n');
  if (!normalizedContent.trim()) {
    return '';
  }

  const lines = normalizedContent.split('\n');
  const refined: string[] = [];
  let inCodeFence = false;
  let previousBlank = false;

  for (const rawLine of lines) {
    const trimmedRight = rawLine.replace(/[ \t]+$/g, '');

    if (trimmedRight.startsWith('```')) {
      if (!inCodeFence && previousBlank && refined.length === 0) {
        previousBlank = false;
      }
      refined.push(trimmedRight);
      inCodeFence = !inCodeFence;
      previousBlank = false;
      continue;
    }

    if (inCodeFence) {
      refined.push(trimmedRight);
      previousBlank = false;
      continue;
    }

    if (!trimmedRight.trim()) {
      if (!previousBlank && refined.length > 0) {
        refined.push('');
      }
      previousBlank = true;
      continue;
    }

    let nextLine = trimmedRight;
    const checklistMatch = nextLine.match(/^(?:[-*•–—]\s+)?\[( |x|X)\]\s+(.*)$/);

    if (checklistMatch) {
      nextLine = `- [${checklistMatch[1].toLowerCase() === 'x' ? 'x' : ' '}] ${checklistMatch[2].trim()}`;
    } else if (/^[-*•–—]\s+/.test(nextLine)) {
      nextLine = `- ${nextLine.replace(/^[-*•–—]\s+/, '').trim()}`;
    }

    refined.push(nextLine);
    previousBlank = false;
  }

  while (refined[0] === '') {
    refined.shift();
  }

  while (refined[refined.length - 1] === '') {
    refined.pop();
  }

  return refined.join('\n');
}

function renderEditorLine(line: string, query: string) {
  if (!line) {
    return <span className="text-white/10"> </span>;
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return line;
  }

  const parts = line.split(new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi'));

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    const isMatch = part.localeCompare(normalizedQuery, undefined, { sensitivity: 'accent' }) === 0;
    return (
      <span
        key={`${part}-${index}`}
        className={isMatch ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(255,255,0,0.18)]' : undefined}
      >
        {part}
      </span>
    );
  });
}

type EditorMirrorProps = {
  text: string;
  activeLine: number;
  searchQuery: string;
};

const EditorMirror = ({ text, activeLine, searchQuery }: EditorMirrorProps) => {
  const lines = text ? text.split('\n') : [''];

  return (
    <div className="space-y-0 font-mono text-[14px]">
      {lines.map((line, index) => (
        <div key={`editor-line-${index}`} className="md-line whitespace-pre text-[14px] text-white/76" data-active={index === activeLine}>
          {renderEditorLine(line, searchQuery)}
        </div>
      ))}
    </div>
  );
};
type FileSystemNodeProps = {
  node: ArchiveNode;
  nodes: ArchiveNode[];
  level?: number;
  query: string;
};

const FileSystemNode = ({ node, nodes, level = 0, query }: FileSystemNodeProps) => {
  const { selectedNodeId, expandedFolderIds, setSelectedNodeId, toggleFolder } = useNoteStore();
  const isExpanded = expandedFolderIds.includes(node.id);
  const isSelected = selectedNodeId === node.id;
  const normalizedQuery = query.trim().toLowerCase();

  const children = nodes.filter((candidate) => candidate.parentId === node.id);
  const visibleChildren = children.filter((child) => matchesDirectoryQuery(child, nodes, normalizedQuery));
  const shouldRender = matchesDirectoryQuery(node, nodes, normalizedQuery);

  if (!shouldRender) {
    return null;
  }

  const handleSelect = () => {
    if (node.type === 'folder') {
      toggleFolder(node.id);
    } else {
      setSelectedNodeId(node.id);
    }
    ArkanAudio.playFast('system_engage');
  };

  return (
    <div className="select-none">
      <button
        type="button"
        onClick={handleSelect}
        data-context-target={node.id}
        data-context-type={node.type === 'folder' ? 'FOLDER' : 'NOTE'}
        data-context-name={node.title}
        className={cn(
          'group flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left transition-all',
          isSelected
            ? 'border-primary/40 bg-primary/10 shadow-[0_0_16px_rgba(255,255,0,0.08)]'
            : 'border-transparent hover:border-primary/15 hover:bg-white/5',
          level > 0 && 'ml-3 w-[calc(100%-0.75rem)] border-l border-primary/10'
        )}
        style={{ paddingLeft: `${level * 14 + 12}px` }}
      >
        {node.type === 'folder' ? (
          <span className="text-primary/50 group-hover:text-primary">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-[14px]" />
        )}
        <span className={cn('text-primary/60 transition-colors', isSelected && 'text-primary')}>
          {node.type === 'folder' ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <FileText size={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[0.24em] text-primary/25">{node.technicalId}</div>
          <div
            className={cn(
              'truncate text-[11px] uppercase tracking-[0.18em] transition-colors',
              isSelected ? 'text-primary' : 'text-white/55 group-hover:text-white/80'
            )}
          >
            {node.type === 'folder' ? `[${node.title}]` : node.title}
          </div>
        </div>
      </button>

      {node.type === 'folder' && isExpanded && visibleChildren.length > 0 ? (
        <div className="mt-1 space-y-1">
          {visibleChildren.map((child) => (
            <FileSystemNode key={child.id} node={child} nodes={nodes} level={level + 1} query={query} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

type CodeFenceBlockProps = {
  language: string;
  codeLines: string[];
  startLine: number;
  closingLine: number | null;
  activeLine: number;
  onCopy: (value: string) => void;
};

const CodeFenceBlock = ({ language, codeLines, startLine, closingLine, activeLine, onCopy }: CodeFenceBlockProps) => {
  const label = language || 'shell.commands';
  const codeValue = codeLines.join('\n');

  return (
    <>
      <div className="md-line md-code-line md-code-line-start flex items-center gap-3 px-5" data-active={startLine === activeLine}>
        <span className="md-marker">```</span>
        <span className="text-[10px] uppercase tracking-[0.26em] text-primary/75">{label}</span>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCopy(codeValue);
          }}
          className="pointer-events-auto ml-auto inline-flex items-center gap-2 border border-primary/20 px-3 py-1 text-[9px] uppercase tracking-[0.22em] text-primary/60 transition hover:border-primary/50 hover:text-primary"
        >
          <Copy size={12} />
          Copy_Buffer
        </button>
      </div>

      {codeLines.map((line, index) => {
        const lineNumber = String(index + 1).padStart(2, '0');
        const sourceLine = startLine + index + 1;
        return (
          <div key={`code-row-${sourceLine}`} className="md-line md-code-line flex items-center gap-4 px-5" data-active={sourceLine === activeLine}>
            <span className="w-5 text-[9px] uppercase tracking-[0.18em] text-primary/25">{lineNumber}</span>
            <div className="min-w-0 flex-1 whitespace-pre text-[13px]">{renderCodeTokens(line)}</div>
          </div>
        );
      })}

      {closingLine !== null ? (
        <div className="md-line md-code-line md-code-line-end flex items-center gap-3 px-5" data-active={closingLine === activeLine}>
          <span className="md-marker">```</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-white/20">Buffer_Secured</span>
        </div>
      ) : null}
    </>
  );
};

type TerminalRendererProps = {
  text: string;
  activeLine: number;
  onToggleChecklist: (lineIndex: number) => void;
  onCopyCode: (value: string) => void;
};

const TerminalRenderer = ({ text, activeLine, onToggleChecklist, onCopyCode }: TerminalRendererProps) => {
  if (!text) {
    return null;
  }

  const lines = text.split('\n');
  const renderedBlocks: React.ReactNode[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    if (line.startsWith('```')) {
      const startLine = lineIndex;
      const language = line.slice(3).trim();
      lineIndex += 1;

      const codeLines: string[] = [];
      while (lineIndex < lines.length && !lines[lineIndex].startsWith('```')) {
        codeLines.push(lines[lineIndex]);
        lineIndex += 1;
      }

      const closingLine = lineIndex < lines.length && lines[lineIndex].startsWith('```') ? lineIndex : null;

      renderedBlocks.push(
        <CodeFenceBlock
          key={`code-${startLine}`}
          language={language}
          codeLines={codeLines}
          startLine={startLine}
          closingLine={closingLine}
          activeLine={activeLine}
          onCopy={onCopyCode}
        />
      );

      if (closingLine !== null) {
        lineIndex += 1;
      }

      continue;
    }
    const isActive = lineIndex === activeLine;
    const checklistMatch = line.match(/^- \[( |x)\] (.*)$/);

    if (!line.trim()) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line" data-active={isActive}>
          {' '}
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (checklistMatch) {
      const checked = checklistMatch[1] === 'x';
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3" data-active={isActive}>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleChecklist(lineIndex);
            }}
            className={cn('md-checkbox pointer-events-auto', checked && 'checked')}
          >
            {checked ? <CheckCircle2 size={12} className="text-primary" /> : null}
          </button>
          <span className="md-marker">- [{checked ? 'x' : ' '}]</span>
          <span className={cn('whitespace-pre text-[14px]', checked ? 'text-white/35 line-through' : 'text-white/75')}>
            {renderInlineContent(checklistMatch[2])}
          </span>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3 text-[17px] font-semibold uppercase tracking-[0.1em] text-primary/90" data-active={isActive}>
          <span className="md-marker">###</span>
          <span className="drop-shadow-[0_0_10px_rgba(255,255,0,0.28)]">{line.slice(4)}</span>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3 text-[21px] font-semibold uppercase tracking-[0.08em] text-primary" data-active={isActive}>
          <span className="md-marker">##</span>
          <span className="drop-shadow-[0_0_12px_rgba(255,255,0,0.32)]">{line.slice(3)}</span>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3 text-[26px] font-bold uppercase tracking-[0.08em] text-primary" data-active={isActive}>
          <span className="md-marker">#</span>
          <span className="drop-shadow-[0_0_16px_rgba(255,255,0,0.42)]">{line.slice(2)}</span>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (/^-{3,}$/.test(line.trim())) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3" data-active={isActive}>
          <span className="md-marker">---</span>
          <span className="h-px flex-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 shadow-[0_0_12px_rgba(255,255,0,0.25)]" />
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3 border-l border-primary/30 pl-4 text-[14px] italic text-white/55" data-active={isActive}>
          <span className="md-marker">&gt;</span>
          <span className="whitespace-pre">{renderInlineContent(line.slice(2))}</span>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    if (line.startsWith('>> ')) {
      renderedBlocks.push(
        <div key={`line-${lineIndex}`} className="md-line flex items-center gap-3 text-[14px] text-white/70" data-active={isActive}>
          <span className="md-marker">&gt;&gt;</span>
          <span className="whitespace-pre uppercase tracking-[0.06em]">{renderInlineContent(line.slice(3))}</span>
        </div>
      );
      lineIndex += 1;
      continue;
    }

    renderedBlocks.push(
      <div key={`line-${lineIndex}`} className="md-line whitespace-pre text-[14px] text-white/76" data-active={isActive}>
        {renderInlineContent(line)}
      </div>
    );
    lineIndex += 1;
  }

  return <div className="space-y-0 font-mono text-[14px]">{renderedBlocks}</div>;
};

export default function NotesPage() {
  const { nodes, selectedNodeId, updateNode, addNode } = useNoteStore();
  const { addTask } = useTaskStore();
  const { logs, addLog } = useSystemLogStore();
  const { metrics, updateMetrics } = useHardwareMetrics();
  const { heartbeatMs, cpuUsage, memUsage, netSpeed, tick } = useChronosStore();
  const [isEditing, setIsEditing] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [editorQuery, setEditorQuery] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartRef = useRef(Date.now());

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId && node.type === 'note'),
    [nodes, selectedNodeId]
  );

  const selectedContainerId = useMemo(() => {
    const selected = nodes.find((node) => node.id === selectedNodeId);
    if (!selected) {
      return 'f2';
    }
    return selected.type === 'folder' ? selected.id : selected.parentId;
  }, [nodes, selectedNodeId]);

  const [cursor, setCursor] = useState({ line: 0, char: 0 });
  const selectedContent = selectedNode?.content ?? '';
  const lineCount = useMemo(() => (selectedContent ? selectedContent.split('\n').length : 0), [selectedContent]);
  const wordCount = useMemo(() => selectedContent.trim().split(/\s+/).filter(Boolean).length, [selectedContent]);

  const noteMatchCount = useMemo(() => {
    if (!editorQuery.trim() || !selectedContent) {
      return 0;
    }

    const matches = selectedContent.match(new RegExp(escapeRegExp(editorQuery.trim()), 'gi'));
    return matches?.length ?? 0;
  }, [editorQuery, selectedContent]);

  const updateCursor = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const textBefore = editorRef.current.value.substring(0, editorRef.current.selectionStart);
    const lines = textBefore.split('\n');
    setCursor({ line: Math.max(lines.length - 1, 0), char: lines[lines.length - 1]?.length ?? 0 });
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    updateCursor();
    requestAnimationFrame(() => editorRef.current?.focus());
  }, [selectedNode?.id, updateCursor]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      updateMetrics();
      tick();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [tick, updateMetrics]);

  const handleEditorChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!selectedNode) {
        return;
      }

      const nextContent = event.target.value;
      const nextTitle = deriveNoteTitle(nextContent, selectedNode.title);

      updateNode(selectedNode.id, {
        content: nextContent,
        ...(nextTitle !== selectedNode.title ? { title: nextTitle } : {}),
      });
      updateCursor();
    },
    [selectedNode, updateNode, updateCursor]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = event.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;

      if (event.key === 'Enter') {
        ArkanAudio.playFast('system_execute_clack_heavy');
        window.setTimeout(updateCursor, 0);
        return;
      }

      if (event.key === 'Backspace') {
        ArkanAudio.playFast('delete_chirp_back');
        window.setTimeout(updateCursor, 0);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        ArkanAudio.playFast('key_tick_mechanical');
        const nextValue = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
        if (selectedNode) {
          const nextTitle = deriveNoteTitle(nextValue, selectedNode.title);
          updateNode(selectedNode.id, {
            content: nextValue,
            ...(nextTitle !== selectedNode.title ? { title: nextTitle } : {}),
          });
          window.setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
            updateCursor();
          }, 0);
        }
        return;
      }

      if (event.key === ' ') {
        ArkanAudio.playFast('thump_hollow_space');
      } else {
        ArkanAudio.playFast('key_tick_mechanical');
      }

      window.setTimeout(updateCursor, 0);
    },
    [selectedNode, updateCursor, updateNode]
  );

  const handleEditorSurfaceMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing || !editorRef.current) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    event.preventDefault();
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      updateCursor();
    });
  }, [isEditing, updateCursor]);

  const handleCreateEntry = useCallback(() => {
    const technicalId = `NT-${Math.floor(Math.random() * 900) + 100}`;
    const title = 'UNTITLED_NOTE';
    const parentId = selectedContainerId ?? null;

    addNode({
      technicalId,
      title,
      type: 'note',
      parentId,
      content: '',
    });

    addLog('ARCHIVE_ENTRY_READY_FOR_INPUT', 'status');
    ArkanAudio.playFast('system_engage');
    window.setTimeout(() => {
      editorRef.current?.focus();
      updateCursor();
    }, 0);
  }, [addLog, addNode, selectedContainerId, updateCursor]);

  const handleRefineNote = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    const nextContent = refineNoteContent(selectedContent);
    const nextTitle = deriveNoteTitle(nextContent, selectedNode.title);
    const hasChanges = nextContent !== selectedContent || nextTitle !== selectedNode.title;

    if (!hasChanges) {
      addLog('NOTE_BUFFER_ALREADY_PRECISE', 'status');
      ArkanAudio.playFast('key_tick_mechanical');
      return;
    }

    updateNode(selectedNode.id, {
      content: nextContent,
      ...(nextTitle !== selectedNode.title ? { title: nextTitle } : {}),
    });
    addLog('NOTE_BUFFER_REFINED', 'sync');
    ArkanAudio.playFast('system_engage');

    window.setTimeout(() => {
      editorRef.current?.focus();
      updateCursor();
    }, 0);
  }, [addLog, selectedContent, selectedNode, updateCursor, updateNode]);

  const handleToggleChecklist = useCallback(
    (lineIndex: number) => {
      if (!selectedNode) {
        return;
      }

      const lines = selectedContent.split('\n');
      const match = lines[lineIndex]?.match(/^- \[( |x)\] (.*)$/);
      if (!match) {
        return;
      }

      const nextMark = match[1] === 'x' ? ' ' : 'x';
      lines[lineIndex] = `- [${nextMark}] ${match[2]}`;
      updateNode(selectedNode.id, { content: lines.join('\n') });
      addLog(`CHECKLIST_NODE_${nextMark === 'x' ? 'ENGAGED' : 'RESET'}`, 'sync');
      ArkanAudio.playFast('system_engage');

      window.setTimeout(() => {
        if (!editorRef.current) {
          return;
        }

        const nextIndex = getTextIndexFromPosition(lines, lineIndex, Math.min(6, lines[lineIndex].length));
        editorRef.current.focus();
        editorRef.current.selectionStart = editorRef.current.selectionEnd = nextIndex;
        updateCursor();
      }, 0);
    },
    [addLog, selectedContent, selectedNode, updateCursor, updateNode]
  );

  const handleCopyCode = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        addLog('MARKDOWN_BUFFER_COPIED', 'status');
        ArkanAudio.playFast('system_engage');
      } catch {
        addLog('CLIPBOARD_ACCESS_DENIED', 'error');
      }
    },
    [addLog]
  );

  const handleExtractTasks = useCallback(async () => {
    if (!selectedContent) {
      return;
    }

    const lines = selectedContent.split('\n');
    const taskLines = lines.filter((line) => line.trim().startsWith('- [ ]'));

    await Promise.all(
      taskLines.map((line) =>
        addTask({
          title: line.replace('- [ ]', '').trim() || 'EXTRACTED_TASK',
          status: 'todo',
          priority: 'medium',
          projectId: 'neural_archive',
        })
      )
    );

    addLog(`${taskLines.length}_TASKS_EXTRACTED_TO_OPERATIONS`, 'sync');
    ArkanAudio.playFast('system_purge');
  }, [addLog, addTask, selectedContent]);

  const handleAiAction = useCallback(
    (message: string) => {
      addLog(message, 'status');
      ArkanAudio.playFast('system_engage');
    },
    [addLog]
  );

  const handleShareCurrentNote = useCallback(async () => {
    if (!selectedNode || selectedNode.type !== 'note') {
      addLog('SHARE_REJECTED_NO_NOTE_SELECTED', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedContent);
      addLog(`NOTE_CONTENT_COPIED:${selectedNode.technicalId}`, 'status');
      ArkanAudio.playFast('system_execute_clack');
    } catch {
      addLog('NOTE_SHARE_CLIPBOARD_DENIED', 'error');
    }
  }, [addLog, selectedContent, selectedNode]);

  const handleExportNotesBackup = useCallback(() => {
    const backup = buildNotesBackup(nodes, selectedNodeId);
    triggerDownload('arkan-notes-backup.json', JSON.stringify(backup, null, 2), 'application/json');
    addLog('NOTES_BACKUP_READY', 'system');
    ArkanAudio.playFast('system_execute_clack');
  }, [addLog, nodes, selectedNodeId]);

  const handleExportMarkdown = useCallback(() => {
    const markdown = selectedNode
      ? buildSelectedNoteMarkdown(selectedNode)
      : buildNotesMarkdown(nodes);

    if (!markdown.trim()) {
      addLog('MARKDOWN_EXPORT_REJECTED_NO_NOTE', 'warning');
      return;
    }

    const filename = selectedNode
      ? `${sanitizeFilename(selectedNode.title)}.md`
      : 'arkan-notes-export.md';

    triggerDownload(filename, markdown, 'text/markdown;charset=utf-8');
    addLog(selectedNode ? `MARKDOWN_NOTE_EXPORTED:${selectedNode.technicalId}` : 'MARKDOWN_ARCHIVE_EXPORTED', 'system');
    ArkanAudio.playFast('system_execute_clack');
  }, [addLog, nodes, selectedNode]);

  const handlePatternRecognition = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'note') {
      addLog('PATTERN_RECOGNITION_REJECTED_NO_NOTE', 'warning');
      return;
    }

    const headings = selectedContent
      .split('\n')
      .filter((line) => /^#{1,3}\s+/.test(line))
      .map((line) => line.replace(/^#{1,3}\s+/, '- '))
      .join('\n');

    addNode({
      technicalId: `NT-${Math.floor(100 + Math.random() * 900)}`,
      title: `${selectedNode.title}_PATTERNS`,
      type: 'note',
      parentId: selectedNode.parentId,
      content: `# ${selectedNode.title}_PATTERNS\n\n${headings || '- NO_HEADINGS_DETECTED'}\n\nGenerated from local archive buffer.`,
    });
    addLog(`PATTERN_NOTE_CREATED:${selectedNode.technicalId}`, 'status');
    ArkanAudio.playFast('system_execute_clack');
  }, [addLog, addNode, selectedContent, selectedNode]);

  const rootNodes = useMemo(() => nodes.filter((node) => node.parentId === null), [nodes]);
  const visibleRootNodes = useMemo(
    () => rootNodes.filter((node) => matchesDirectoryQuery(node, nodes, directoryQuery.trim().toLowerCase())),
    [directoryQuery, nodes, rootNodes]
  );
  const recentLogs = useMemo(() => logs.slice(0, 4), [logs]);

  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-[#020200] text-white">
      <div className="arkan-grid-overlay opacity-20" />
      <div className="crt-overlay absolute inset-0 opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,0,0.08),transparent_55%)]" />

      <div className="relative z-10 flex h-full min-h-0 w-full overflow-hidden">
        <div className="relative flex h-full shrink-0">
          <section className={cn('flex h-full flex-col border-r border-primary/10 bg-black/70 backdrop-blur-sm transition-all duration-300', sidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80')}>
            <div className="border-b border-primary/10 px-5 py-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-primary/50">Archive_Directory</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.26em] text-white/20">Live_Markdown_v2</div>
                </div>
                <div className="border border-primary/20 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-primary/60">v4.0.2</div>
              </div>

              <button type="button" onClick={handleCreateEntry} className="flex w-full items-center justify-center gap-2 border border-primary/50 bg-primary/8 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-primary transition hover:bg-primary hover:text-black">
                <Plus size={16} />
                Initialize_Entry
              </button>

              <label className="mt-4 flex items-center gap-3 border border-primary/15 bg-black/80 px-3 py-3 text-primary/40 focus-within:border-primary/40 focus-within:text-primary/70">
                <Search size={14} />
                <input
                  value={directoryQuery}
                  onChange={(event) => setDirectoryQuery(event.target.value)}
                  placeholder="QUERY_ACTIVE..."
                  className="w-full bg-transparent text-[11px] uppercase tracking-[0.18em] text-white/65 outline-none placeholder:text-white/18"
                />
              </label>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar">
              {visibleRootNodes.map((node) => (
                <FileSystemNode key={node.id} node={node} nodes={nodes} query={directoryQuery} />
              ))}
            </div>

            <div className="border-t border-primary/10 px-5 py-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/25">
                <span>Storage_Grid</span>
                <span className="text-primary/60">74.2GB</span>
              </div>
              <div className="mt-3 h-1 bg-white/5">
                <div className="h-full w-[74%] bg-primary shadow-[0_0_10px_rgba(255,255,0,0.5)]" />
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => {
              setSidebarCollapsed((current) => !current);
              ArkanAudio.playFast('key_tick_mechanical');
            }}
            className={cn('absolute top-1/2 z-30 flex h-16 w-5 -translate-y-1/2 items-center justify-center border border-primary/15 bg-black/90 text-primary/60 transition hover:text-primary', sidebarCollapsed ? 'left-0' : 'left-80')}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-primary/10 bg-black/75 px-6 py-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.28em] text-white/35">
                  <span className="text-primary">System_Status: Operational</span>
                  <span>CPU: {metrics.cpu}%</span>
                  <span>MEM: {metrics.ram.toFixed(1)}GB</span>
                  <span>NET: {netSpeed}</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/18">Neural_Archive / In-Situ_Renderer / Twin_Layer_Protocol</div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex h-10 min-w-[280px] items-center gap-3 border border-primary/15 bg-black/80 px-3 text-primary/40 focus-within:border-primary/40 focus-within:text-primary/70">
                  <Search size={14} />
                  <input
                    value={editorQuery}
                    onChange={(event) => setEditorQuery(event.target.value)}
                    placeholder="SCAN_ACTIVE_BUFFER..."
                    className="w-full bg-transparent text-[11px] uppercase tracking-[0.18em] text-white/70 outline-none placeholder:text-white/18"
                  />
                </label>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-white/40">
                  <div className="border border-primary/20 px-3 py-2 text-primary/75">{noteMatchCount}_MATCHES</div>
                  <div className="inline-flex items-center gap-2 border border-primary/20 px-3 py-2 text-primary/80">
                    <User size={12} />
                    AL
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-primary/10">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/10 bg-black/65 px-6 py-3">
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        editorRef.current?.blur();
                      } else {
                        editorRef.current?.focus();
                      }
                    }}
                    className="border border-primary/35 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-primary shadow-[0_0_10px_rgba(255,255,0,0.18)] transition hover:bg-primary/10"
                  >
                    {isEditing ? 'Live_Markdown_v2' : 'Read_Sync'}
                  </button>
                  <div className="min-w-0 truncate text-[11px] uppercase tracking-[0.24em] text-white/45">
                    {selectedNode?.title ?? 'Neural_Sync_Protocol.md'}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/35">
                  <button type="button" onClick={handleExportNotesBackup} className="border border-primary/15 p-2 transition hover:border-primary/40 hover:text-primary" aria-label="Export notes backup">
                    <FileArchive size={14} />
                  </button>
                  <button type="button" onClick={handleExportMarkdown} className="border border-primary/15 p-2 transition hover:border-primary/40 hover:text-primary" aria-label="Export markdown">
                    <Download size={14} />
                  </button>
                  <button type="button" onClick={() => void handleShareCurrentNote()} className="border border-primary/15 p-2 transition hover:border-primary/40 hover:text-primary">
                    <Share2 size={14} />
                  </button>
                  <button type="button" onClick={() => handleAiAction('NEURAL_ARCHIVE_CONTEXT_MENU_ENGAGED')} className="border border-primary/15 p-2 transition hover:border-primary/40 hover:text-primary">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>

              <div className="relative flex-1 overflow-auto bg-black/55 custom-scrollbar" onMouseDown={handleEditorSurfaceMouseDown}>
                {selectedNode ? (
                  <div className="relative min-h-full" style={{ padding: `${PADDING_V}px ${PADDING_H}px` }}>
                    {isEditing ? (
                      <div className="relative z-20 pointer-events-none">
                        <EditorMirror text={selectedContent} activeLine={cursor.line} searchQuery={editorQuery} />
                      </div>
                    ) : (
                      <div className="relative z-20">
                        <TerminalRenderer text={selectedContent} activeLine={cursor.line} onToggleChecklist={handleToggleChecklist} onCopyCode={handleCopyCode} />
                      </div>
                    )}

                    <textarea
                      ref={editorRef}
                      value={selectedContent}
                      onChange={handleEditorChange}
                      onKeyDown={handleKeyDown}
                      onKeyUp={updateCursor}
                      onSelect={updateCursor}
                      onFocus={() => setIsEditing(true)}
                      onBlur={() => setIsEditing(false)}
                      spellCheck={false}
                      wrap="off"
                      className={cn(
                        'selection-yellow absolute inset-0 h-full w-full resize-none bg-transparent font-mono text-transparent outline-none',
                        isEditing ? 'z-30' : 'pointer-events-none z-0'
                      )}
                      style={{
                        padding: `${PADDING_V}px ${PADDING_H}px`,
                        fontSize: `${FONT_SIZE}px`,
                        lineHeight: `${LINE_HEIGHT}px`,
                        letterSpacing: '0px',
                        fontFamily: '"JetBrains Mono", monospace',
                        caretColor: isEditing ? '#f9f906' : 'transparent',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-6">
                    <div className="space-y-4 text-center">
                      <FileSearch size={48} className="mx-auto text-primary/20" />
                      <div className="text-[11px] uppercase tracking-[0.3em] text-primary/45">Select_Node_To_Initialize_Buffer</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="hidden w-80 shrink-0 flex-col border-l border-primary/10 bg-black/70 xl:flex">
              <div className="border-b border-primary/10 px-6 py-5">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="text-primary" size={20} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-primary/65">AI_Synapse_Module</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/20">Available_Operations</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 custom-scrollbar">
                <button type="button" onClick={() => void handleExtractTasks()} className="flex w-full items-center gap-3 border border-primary/15 bg-white/5 px-4 py-4 text-left transition hover:border-primary/35 hover:bg-primary/5">
                  <TaskAlt size={18} className="text-primary/70" />
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/70">Extract_Subroutines</span>
                </button>

                <button type="button" onClick={handleRefineNote} className="flex w-full items-center gap-3 border border-primary/15 bg-white/5 px-4 py-4 text-left transition hover:border-primary/35 hover:bg-primary/5">
                  <FileText size={18} className="text-primary/70" />
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/70">Refine_Note</span>
                </button>

                <button type="button" onClick={handlePatternRecognition} className="flex w-full items-center gap-3 border border-primary/15 bg-white/5 px-4 py-4 text-left transition hover:border-primary/35 hover:bg-primary/5">
                  <Search size={18} className="text-primary/70" />
                  <span className="text-[11px] uppercase tracking-[0.22em] text-white/70">Pattern_Recognition</span>
                </button>

                <div className="border border-primary/15 bg-primary/6 p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-primary">
                    <Sparkles size={14} />
                    Synergy_Suggestion
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-white/55">
                    Refinement now preserves your text and only normalizes spacing, bullet markers, and checklists for a cleaner buffer.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={handleRefineNote} className="bg-primary px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-black transition hover:brightness-110">
                      Accept
                    </button>
                    <button type="button" onClick={() => addLog('SUGGESTION_DISMISSED', 'status')} className="border border-primary/15 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/45 transition hover:border-primary/35 hover:text-primary">
                      Archive
                    </button>
                  </div>
                </div>

                <div className="space-y-4 border-t border-primary/10 pt-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/30">
                    <span>Context_Awareness</span>
                    <span className="text-primary">84%</span>
                  </div>
                  <div className="h-1 bg-white/5">
                    <div className="h-full w-[84%] bg-primary shadow-[0_0_10px_rgba(255,255,0,0.5)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.18em] text-white/30">
                    <div className="border border-primary/10 p-3">
                      <div className="flex items-center gap-2 text-primary/70">
                        <Lock size={12} />
                        ZKP_Link
                      </div>
                      <div className="mt-2 text-white/45">Active</div>
                    </div>
                    <div className="border border-primary/10 p-3">
                      <div className="flex items-center gap-2 text-primary/70">
                        <Database size={12} />
                        Sync_Node
                      </div>
                      <div className="mt-2 text-white/45">Nominal</div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
          <footer className="border-t border-primary/10 bg-black/75 px-6 py-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.4fr)]">
              <div className="border border-primary/10 bg-black/80 px-4 py-4">
                <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-primary/65">
                  <span>Telemetry_Logs</span>
                  <span className="text-white/25">Neural_Archive_Renderer</span>
                </div>
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em]">
                      <span className="text-primary/35">[{log.timestamp}]</span>
                      <span className="text-primary/55">[{log.type}]</span>
                      <span className="text-white/55">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
                <div className="border border-primary/10 bg-black/80 px-4 py-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/65">
                    <Activity size={12} />
                    Active_Line
                  </div>
                  <div className="mt-3 text-[24px] font-semibold tracking-[0.08em] text-primary">{String(cursor.line + 1).padStart(2, '0')}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">Chars: {cursor.char}</div>
                </div>

                <div className="border border-primary/10 bg-black/80 px-4 py-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/65">
                    <Cpu size={12} />
                    Buffer_Stats
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/35">{lineCount}_lines / {wordCount}_tokens</div>
                  <div className="mt-2 h-1 bg-white/5">
                    <div className="h-full w-[68%] bg-primary shadow-[0_0_10px_rgba(255,255,0,0.5)]" />
                  </div>
                </div>

                <div className="border border-primary/10 bg-black/80 px-4 py-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary/65">
                    <Zap size={12} />
                    Data_Sync
                  </div>
                  <div className="mt-3 text-[22px] font-semibold tracking-[0.08em] text-primary">{formatRuntime(sessionStartRef.current)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">Latency: {Math.round(heartbeatMs)}ms</div>
                </div>
              </div>

              <div className="border border-primary/10 bg-primary/8 px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Uplink_Status</div>
                <div className="mt-3 text-[18px] font-semibold tracking-[0.08em] text-primary">Nominal</div>
                <div className="mt-4 space-y-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                  <div className="flex items-center justify-between">
                    <span>CPU_Core_Load</span>
                    <span className="text-primary">{cpuUsage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Memory_Pool</span>
                    <span className="text-primary">{memUsage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Integrity_Mode</span>
                    <span className="text-primary">Secure</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-4 text-[10px] uppercase tracking-[0.24em] text-white/25">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2 text-primary/80">
                  <Command size={12} />
                  CWD+K Ready
                </span>
                <span>Node_Lock: Stable</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Runtime: {formatRuntime(sessionStartRef.current)}</span>
                <span>Editor_Mode: {isEditing ? 'Live' : 'Idle'}</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
