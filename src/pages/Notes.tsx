import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNoteStore, ArchiveNode } from '@/store/useNoteStore';
import { useTaskStore } from '@/store/useTaskStore';
import { ArkanAudio } from '@/lib/audio/ArkanAudio';
import { cn } from '@/lib/utils';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  FileText, 
  Plus, 
  Share2, 
  MoreVertical, 
  Zap, 
  Lock, 
  User, 
  Cpu, 
  Search, 
  CheckCircle2, 
  FileSearch, 
  BrainCircuit,
  Sparkles,
  FileText as Summarize,
  Search as Troubleshoot,
  CheckSquare as TaskAlt
} from 'lucide-react';

// Recursive Sidebar Component
const FileSystemNode = ({ 
  node, 
  nodes, 
  level = 0 
}: { 
  node: ArchiveNode, 
  nodes: ArchiveNode[], 
  level?: number 
}) => {
  const { selectedNodeId, expandedFolderIds, setSelectedNodeId, toggleFolder } = useNoteStore();
  const isExpanded = expandedFolderIds.includes(node.id);
  const isSelected = selectedNodeId === node.id;
  
  const children = nodes.filter(n => n.parentId === node.id);
  const hasChildren = children.length > 0;

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
      <div 
        onClick={handleSelect}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded transition-all group",
          isSelected ? "bloom-active" : "hover:bg-white/5",
          level > 0 && "ml-4 border-l border-white/10"
        )}
        style={{ paddingLeft: `${level * 4 + 8}px` }}
        data-context-target={node.id}
        data-context-type={node.type === 'folder' ? 'FOLDER' : 'TASK'}
        data-context-name={node.title}
      >
        {node.type === 'folder' && (
          <span className="text-primary/40 group-hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <span className={cn(
          "text-primary transition-colors",
          isSelected ? "text-primary" : "text-primary/60 group-hover:text-primary"
        )}>
          {node.type === 'folder' ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <FileText size={14} />}
        </span>
        <div className="flex flex-col overflow-hidden">
          {node.type === 'note' && (
            <span className="text-[8px] font-mono text-primary/30 leading-none">{node.technicalId}</span>
          )}
          <span className={cn(
            "text-[11px] font-mono uppercase tracking-tight truncate",
            isSelected ? "text-primary font-bold glow-text" : "text-white/70 group-hover:text-primary"
          )}>
            {node.type === 'folder' ? `[${node.title}]` : node.title}
          </span>
        </div>
      </div>
      
      {node.type === 'folder' && isExpanded && (
        <div className="mt-1">
          {children.map(child => (
            <FileSystemNode key={child.id} node={child} nodes={nodes} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const LINE_HEIGHT = 24;
const FONT_SIZE = 14;
const PADDING_V = 60;
const PADDING_H = 80;
const CHAR_WIDTH = 8.4; // Precise for JetBrains Mono at 14px

export default function NotesPage() {
  const { nodes, selectedNodeId, updateNode, addNode } = useNoteStore();
  const { addTask } = useTaskStore();
  const [isEditing, setIsEditing] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId && n.type === 'note'),
    [nodes, selectedNodeId]
  );

  const [cursor, setCursor] = useState({ line: 0, char: 0 });

  const updateCursor = useCallback(() => {
    if (!editorRef.current) return;
    const textBefore = editorRef.current.value.substring(0, editorRef.current.selectionStart);
    const lines = textBefore.split('\n');
    setCursor({
      line: lines.length - 1,
      char: lines[lines.length - 1].length
    });
  }, []);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedNode) {
      updateNode(selectedNode.id, { content: e.target.value });
      updateCursor();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    if (e.key === 'Enter') {
      ArkanAudio.playFast('system_execute_clack_heavy');
      setTimeout(() => {
        const container = textarea.parentElement?.parentElement;
        if (container) {
          const cursorY = (value.substring(0, textarea.selectionStart).split('\n').length) * LINE_HEIGHT;
          const containerHeight = container.clientHeight;
          const scrollThreshold = containerHeight * 0.8;
          
          if (cursorY - container.scrollTop > scrollThreshold) {
            container.scrollTo({
              top: cursorY - containerHeight * 0.5,
              behavior: 'smooth'
            });
          }
        }
        updateCursor();
      }, 10);
    } else if (e.key === 'Backspace') {
      ArkanAudio.playFast('delete_chirp_back');
      setTimeout(updateCursor, 0);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      ArkanAudio.playFast('key_tick_mechanical');
      const newValue = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd);
      if (selectedNode) {
        updateNode(selectedNode.id, { content: newValue });
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
          updateCursor();
        }, 0);
      }
    } else if (e.key === ' ') {
      ArkanAudio.playFast('thump_hollow_space');
      setTimeout(updateCursor, 0);
    } else {
      ArkanAudio.playFast('key_tick_mechanical');
      setTimeout(updateCursor, 0);
    }
  };

  useEffect(() => {
    if (selectedNode) {
      updateCursor();
    }
  }, [selectedNode?.id, updateCursor]);

  const extractTasks = () => {
    if (!selectedNode?.content) return;
    
    const lines = selectedNode.content.split('\n');
    const taskLines = lines.filter(line => line.trim().startsWith('- [ ]'));
    
    taskLines.forEach(line => {
      const title = line.replace('- [ ]', '').trim();
      addTask({
        title: title || 'EXTRACTED_TASK',
        status: 'todo',
        priority: 'medium',
        projectId: 'neural_archive'
      });
    });
    
    ArkanAudio.playFast('system_purge');
    alert(`${taskLines.length} TASKS_EXTRACTED_TO_OPERATIONS`);
  };

  const rootNodes = useMemo(() => nodes.filter(n => n.parentId === null), [nodes]);

  const TerminalRenderer = ({ text }: { text: string }) => {
    if (!text) return null;
    const lines = text.split('\n');

    const parseLine = (lineText: string) => {
      let html = lineText;

      // 1. Processar BOLD (**text**)
      html = html.replace(/\*\*(.*?)\*\*/g, 
        '<span class="md-marker">**</span><span class="md-bold">$1</span><span class="md-marker">**</span>'
      );

      // 2. Processar CHECKBOXES ([ ] e [x])
      html = html.replace(/^\[ \] (.*)/, 
        '<div class="flex items-center gap-2"><span class="md-marker">[ ]</span> <span class="text-white/80">$1</span></div>'
      );
      html = html.replace(/^\[x\] (.*)/, 
        '<div class="flex items-center gap-2 opacity-40"><span class="md-marker">[x]</span> <span class="line-through">$1</span></div>'
      );

      return { __html: html };
    };

    return (
      <div className="font-mono text-[14px] w-full">
        {lines.map((line, i) => {
          // H1 Logic
          if (line.startsWith('# ')) {
            return (
              <div key={i} className="flex items-center h-[24px] text-[22px] font-bold text-primary drop-shadow-[0_0_10px_#FFFF00]">
                <span className="md-marker mr-2">#</span>{line.substring(2)}
              </div>
            );
          }

          // H2 Logic
          if (line.startsWith('## ')) {
            return (
              <div key={i} className="flex items-center h-[24px] text-[18px] font-bold text-primary/90">
                <span className="md-marker mr-2">##</span>{line.substring(3)}
              </div>
            );
          }

          // Default Inline Parsing
          return (
            <div 
              key={i} 
              className="flex items-center h-[24px] whitespace-pre"
              dangerouslySetInnerHTML={parseLine(line)}
            />
          );
        })}
      </div>
    );
  };



  return (
    <div className="flex h-screen w-full technical-grid relative bg-black text-gray-300 font-display selection-yellow overflow-hidden">
      {/* Sidebar Wrapper */}
      <div className="relative flex h-full shrink-0 z-20">
        <section className={cn(
          "border-r border-border-dark flex flex-col bg-surface-dark/40 backdrop-blur-sm transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-0 overflow-hidden border-none" : "w-80"
        )}>
          <div className="p-6 border-b border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-mono tracking-widest text-primary/60 uppercase">Archive_Directory</h2>
              <span className="text-[10px] font-mono text-primary/40">V 4.0.2</span>
            </div>
            <button 
              onClick={() => {
                addNode({
                  technicalId: `NT-${Math.floor(Math.random() * 900) + 100}`,
                  title: 'NEW_ENTRY',
                  type: 'note',
                  parentId: null,
                  content: '# NEW_ENTRY\n\nStart typing...'
                });
                ArkanAudio.playFast('system_engage');
              }}
              className="w-full py-3 px-4 border border-primary text-primary hover:bg-primary hover:text-black transition-all duration-300 rounded-sm font-mono text-sm tracking-tighter glow-border flex items-center justify-center gap-2 group shadow-[0_0_10px_rgba(249,249,6,0.2)]"
            >
              <Plus size={18} />
              <span>+ NEW_ENTRY</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <h3 className="text-[10px] font-mono tracking-[0.2em] text-white/30 uppercase mb-4 px-2">File_System</h3>
            <div className="space-y-1">
              {rootNodes.map(node => (
                <FileSystemNode key={node.id} node={node} nodes={nodes} />
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border-dark bg-black/40">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/20">
              <Cpu size={12} />
              <span>74.2 GB / 100 GB REMAINING</span>
            </div>
          </div>
        </section>

        {/* Toggle Button */}
        <button 
          onClick={() => {
            setSidebarCollapsed(!sidebarCollapsed);
            ArkanAudio.playFast('key_tick_mechanical');
          }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-16 bg-border-dark border border-white/10 flex items-center justify-center text-primary/60 hover:text-primary z-30 rounded-r-md transition-all duration-300 group",
            sidebarCollapsed ? "left-0" : "left-80"
          )}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Main Content - Editor */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black/20">
        <div className="flex-1 overflow-hidden flex">
          {/* Editor Area */}
          <div 
            className="flex-1 relative overflow-y-auto custom-scrollbar bg-black scroll-smooth"
            onClick={() => editorRef.current?.focus()}
          >
            {selectedNode ? (
              <div className="relative min-h-full" style={{ padding: `${PADDING_V}px ${PADDING_H}px` }}>
                
                {/* Camada 1: O Cursor Técnico (Z-30) */}
                <div 
                  className="absolute z-30 w-[8px] bg-primary animate-[pulse_1s_steps(1)_infinite]"
                  style={{
                    height: `${LINE_HEIGHT - 6}px`,
                    top: `${PADDING_V + (cursor.line * LINE_HEIGHT) + 3}px`,
                    left: `${PADDING_H + (cursor.char * CHAR_WIDTH)}px`,
                    pointerEvents: 'none'
                  }}
                />

                {/* Camada 2: Renderizador Visual (Z-10) */}
                <div className="relative z-10">
                  <TerminalRenderer text={selectedNode.content || ''} />
                </div>

                {/* Camada 3: Input Invisível (Z-20) */}
                <textarea
                  ref={editorRef}
                  value={selectedNode.content}
                  onChange={handleEditorChange}
                  onKeyDown={handleKeyDown}
                  onSelect={updateCursor}
                  spellCheck={false}
                  className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-transparent resize-none outline-none z-20 font-mono selection-yellow"
                  style={{
                    padding: `${PADDING_V}px ${PADDING_H}px`,
                    fontSize: `${FONT_SIZE}px`,
                    lineHeight: `${LINE_HEIGHT}px`,
                    letterSpacing: '0px',
                    fontFamily: '"JetBrains Mono", monospace'
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <FileSearch size={48} className="text-primary/20 mx-auto" />
                  <p className="text-primary/40 font-mono text-xs tracking-[0.3em] uppercase">SELECT_NODE_TO_INITIALIZE_BUFFER</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - AI Synapse */}
          <aside className="w-80 border-l border-border-dark flex flex-col bg-surface-dark/60 backdrop-blur-md z-20">
            <div className="p-6 border-b border-border-dark flex items-center gap-3">
              <div className="relative">
                <BrainCircuit className="text-primary animate-pulse" size={24} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full blur-[2px]"></div>
              </div>
              <h2 className="text-xs font-mono tracking-widest text-white/80 uppercase">AI_Synapse_Module</h2>
            </div>
            
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Available_Operations</label>
                <button 
                  onClick={extractTasks}
                  className="w-full text-left p-4 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group rounded-sm"
                >
                  <div className="flex items-center gap-3">
                    <TaskAlt className="text-primary/60 group-hover:text-primary" size={18} />
                    <span className="text-xs font-mono text-white/70 group-hover:text-primary">EXTRACT_TASKS_FROM_TEXT</span>
                  </div>
                </button>
                <button className="w-full text-left p-4 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group rounded-sm">
                  <div className="flex items-center gap-3">
                    <Summarize className="text-primary/60 group-hover:text-primary" size={18} />
                    <span className="text-xs font-mono text-white/70 group-hover:text-primary">GENERATE_LOG_SUMMARY</span>
                  </div>
                </button>
                <button className="w-full text-left p-4 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all group rounded-sm">
                  <div className="flex items-center gap-3">
                    <Troubleshoot className="text-primary/60 group-hover:text-primary" size={18} />
                    <span className="text-xs font-mono text-white/70 group-hover:text-primary">SEMANTIC_ANALYSIS</span>
                  </div>
                </button>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-dark">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/30 uppercase">Context_Awareness</span>
                  <span className="text-[10px] font-mono text-primary">84%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[84%] shadow-[0_0_8px_rgba(249,249,6,0.5)]"></div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm">
                <h4 className="text-[10px] font-mono text-primary mb-2 flex items-center gap-2">
                  <Sparkles size={14} />
                  SUGGESTION_ACTIVE
                </h4>
                <p className="text-[11px] text-gray-400 font-mono leading-tight">
                  Detection of hardware technical terms. Would you like to link this archive to "CENTRAL_HARDWARE_INDEX"?
                </p>
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-1 bg-primary text-black text-[10px] font-mono font-bold hover:brightness-125 transition-all">ACCEPT</button>
                  <button className="px-3 py-1 border border-white/20 text-white/40 text-[10px] font-mono hover:text-white transition-all">IGNORE</button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border-dark">
              <div className="text-[10px] font-mono text-white/20 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>MODEL_ID:</span>
                  <span className="text-white/40">NEURO_GPT_8.0</span>
                </div>
                <div className="flex justify-between">
                  <span>LATENCY:</span>
                  <span className="text-white/40">12ms</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
