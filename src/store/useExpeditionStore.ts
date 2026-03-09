import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useSystemLogStore } from './useSystemLogStore';
import { ArkanAudio } from '@/lib/audio/ArkanAudio';

export interface ExpeditionItem {
  id: string;
  sector_id: string;
  label: string;
  is_manifested: boolean;
  technical_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
}

export interface ExpeditionSector {
  id: string;
  label: string;
  order_index: number;
  items: ExpeditionItem[];
}

interface ExpeditionState {
  sectors: ExpeditionSector[];
  archivedCount: number;
  isLoading: boolean;
  fetchManifest: () => Promise<void>;
  initializeSector: (label: string) => Promise<void>;
  addComponent: (sectorId: string, label: string) => Promise<void>;
  deManifestItem: (itemId: string) => Promise<void>;
  getReadiness: () => { percentage: number; manifested: number; total: number };
}

export const useExpeditionStore = create<ExpeditionState>((set, get) => ({
  sectors: [],
  archivedCount: 0,
  isLoading: false,

  fetchManifest: async () => {
    set({ isLoading: true });
    try {
      // Fetch sectors
      const { data: sectors, error: secError } = await supabase
        .from('expedition_sectors')
        .select('*')
        .order('order_index', { ascending: true });

      if (secError) throw secError;

      // Fetch active items
      const { data: items, error: itemError } = await supabase
        .from('expedition_items')
        .select('*')
        .eq('is_manifested', false)
        .order('created_at', { ascending: true });

      if (itemError) throw itemError;

      // Fetch manifested count
      const { count, error: countError } = await supabase
        .from('expedition_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_manifested', true);

      if (countError) throw countError;

      const sectorsWithItems = sectors.map(sec => ({
        ...sec,
        items: items.filter(item => item.sector_id === sec.id)
      }));

      set({ sectors: sectorsWithItems, archivedCount: count || 0 });
    } catch (error) {
      console.error('Error fetching expedition manifest:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  initializeSector: async (label: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    useSystemLogStore.getState().addLog(`>> ALLOCATING_NEW_SECTOR: ${label.toUpperCase()}`, 'system');
    
    const { data, error } = await supabase
      .from('expedition_sectors')
      .insert([{ 
        label: label.toUpperCase(), 
        user_id: session.user.id,
        order_index: get().sectors.length 
      }])
      .select()
      .single();

    if (!error && data) {
      set(state => ({
        sectors: [...state.sectors, { ...data, items: [] }]
      }));
      ArkanAudio.play('system_execute_clack');
    }
  },

  addComponent: async (sectorId: string, label: string) => {
    const technicalId = Math.random().toString(16).slice(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('expedition_items')
      .insert([{
        sector_id: sectorId,
        label: label.toUpperCase(),
        technical_id: `NODE_${technicalId}`,
        is_manifested: false,
        priority: 'medium'
      }])
      .select()
      .single();

    if (!error && data) {
      set(state => ({
        sectors: state.sectors.map(s => 
          s.id === sectorId ? { ...s, items: [...s.items, data] } : s
        )
      }));
      ArkanAudio.play('key_tick_mechanical');
    }
  },

  deManifestItem: async (itemId: string) => {
    useSystemLogStore.getState().addLog(`>> INITIATING_DE-MANIFESTATION: NODE_${itemId}`, 'status');
    ArkanAudio.play('ui_confirm_ping');

    const { error } = await supabase
      .from('expedition_items')
      .update({ 
        is_manifested: true,
        de_manifested_at: new Date().toISOString() 
      })
      .eq('id', itemId);

    if (!error) {
      set(state => ({ archivedCount: state.archivedCount + 1 }));
      useSystemLogStore.getState().addLog(`>> ITEM_TRANSFER_TO_ARCHIVE: SUCCESS // NODE_${itemId}`, 'system');
    }
  },

  getReadiness: () => {
    const allItems = get().sectors.flatMap(s => s.items);
    const manifested = get().archivedCount;
    const total = allItems.length + manifested;
    
    return {
      percentage: total > 0 ? Math.round((manifested / total) * 100) : 0,
      manifested,
      total
    };
  }
}));
