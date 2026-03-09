import { create } from "zustand";

export interface ArchiveNode {
  id: string;
  technicalId: string;
  title: string;
  type: 'folder' | 'note';
  parentId: string | null;
  content?: string;
  updatedAt: Date;
}

interface NoteState {
  nodes: ArchiveNode[];
  selectedNodeId: string | null;
  expandedFolderIds: string[];
  addNode: (node: Omit<ArchiveNode, "id" | "updatedAt">) => void;
  updateNode: (id: string, updates: Partial<ArchiveNode>) => void;
  deleteNode: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  toggleFolder: (id: string) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  nodes: [
    { id: 'f1', technicalId: 'DIR-01', title: 'PROJECTS', type: 'folder', parentId: null, updatedAt: new Date() },
    { id: 'f2', technicalId: 'DIR-02', title: 'Active_Protocols', type: 'folder', parentId: 'f1', updatedAt: new Date() },
    { id: 'n1', technicalId: 'NT-402', title: 'NEURAL_SYNC_PROTOCOL', type: 'note', parentId: 'f2', content: '# NEURAL_SYNC_PROTOCOL\n\nInitiating synaptic handshake sequence between **ARKAN_OS** and the peripheral neural mesh. The goal is to minimize latent feedback during intensive command execution.\n\n## CURRENT_METRICS\n\n- Bandwidth: 4.2 TB/s\n- Sync Rate: 99.82%\n- Latency: SUB-1ms\n\n### ACTION_ITEMS\n\n- [x] Recalibrate ocular overlay sensors\n- [ ] Audit localized data caches\n- [x] Initiate deep-sleep diagnostic cycle', updatedAt: new Date() },
    { id: 'n2', technicalId: 'NT-399', title: 'CYBER_LIMB_CALIB', type: 'note', parentId: 'f2', content: '# CYBER_LIMB_CALIB\n\nCalibration data for limb v4.2.', updatedAt: new Date() },
    { id: 'f3', technicalId: 'DIR-03', title: 'Personal_Logs', type: 'folder', parentId: null, updatedAt: new Date() },
    { id: 'f4', technicalId: 'DIR-04', title: 'Technical_Docs', type: 'folder', parentId: null, updatedAt: new Date() },
  ],
  selectedNodeId: 'n1',
  expandedFolderIds: ['f1', 'f2'],
  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, { ...node, id: Math.random().toString(36).substring(7), updatedAt: new Date() }]
  })),
  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((n) => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n)
  })),
  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id && n.parentId !== id)
  })),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  toggleFolder: (id) => set((state) => ({
    expandedFolderIds: state.expandedFolderIds.includes(id)
      ? state.expandedFolderIds.filter(fid => fid !== id)
      : [...state.expandedFolderIds, id]
  })),
}));
