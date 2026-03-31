import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useSystemLogStore } from "./useSystemLogStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import {
  computeExpeditionReadiness,
  hydrateExpeditionManifest,
  type ExpeditionPriority,
  type HydratedExpeditionSector,
  type ManifestItemRow,
} from "@/lib/expeditions";
import { getAuthUser } from "@/lib/auth";

export type ExpeditionItem = ManifestItemRow;
export type ExpeditionSector = HydratedExpeditionSector;

interface ExpeditionState {
  sectors: ExpeditionSector[];
  archivedCount: number;
  isLoading: boolean;
  fetchManifest: () => Promise<void>;
  initializeSector: (label: string) => Promise<void>;
  addComponent: (sectorId: string, label: string, priority?: ExpeditionPriority) => Promise<void>;
  deManifestItem: (itemId: string) => Promise<void>;
  getReadiness: () => { percentage: number; manifested: number; pending: number; total: number };
}

export const useExpeditionStore = create<ExpeditionState>((set, get) => ({
  sectors: [],
  archivedCount: 0,
  isLoading: false,

  fetchManifest: async () => {
    set({ isLoading: true });

    try {
      const user = await getAuthUser();
      if (!user) {
        set({ sectors: [], archivedCount: 0, isLoading: false });
        return;
      }

      const { data: sectors, error: sectorsError } = await supabase
        .from("expedition_sectors")
        .select("id,label,order_index")
        .order("order_index", { ascending: true });

      if (sectorsError) {
        throw sectorsError;
      }

      const { data: items, error: itemsError } = await supabase
        .from("expedition_items")
        .select("id,sector_id,label,is_manifested,technical_id,priority,created_at")
        .order("created_at", { ascending: true });

      if (itemsError) {
        throw itemsError;
      }

      const hydrated = hydrateExpeditionManifest(sectors ?? [], items ?? []);
      const readiness = computeExpeditionReadiness(hydrated);

      set({
        sectors: hydrated,
        archivedCount: readiness.manifested,
      });
    } catch (error) {
      console.error("Error fetching expedition manifest:", error);
      useSystemLogStore.getState().addLog("EXPEDITION_FETCH_FAILED", "error");
    } finally {
      set({ isLoading: false });
    }
  },

  initializeSector: async (label: string) => {
    const normalizedLabel = label.trim().toUpperCase();
    if (!normalizedLabel) {
      return;
    }

    const user = await getAuthUser();
    if (!user) {
      return;
    }

    useSystemLogStore.getState().addLog(`ALLOCATING_NEW_SECTOR:${normalizedLabel}`, "system");

    const { data, error } = await supabase
      .from("expedition_sectors")
      .insert([
        {
          label: normalizedLabel,
          user_id: user.id,
          order_index: get().sectors.length,
        },
      ])
      .select("id,label,order_index")
      .single();

    if (error || !data) {
      useSystemLogStore.getState().addLog("SECTOR_INITIALIZATION_FAILED", "error");
      return;
    }

    set((state) => ({
      sectors: [
        ...state.sectors,
        {
          ...data,
          items: [],
          manifestedCount: 0,
          totalCount: 0,
        },
      ],
    }));
    ArkanAudio.play("system_execute_clack");
  },

  addComponent: async (sectorId: string, label: string, priority: ExpeditionPriority = "medium") => {
    const normalizedLabel = label.trim().toUpperCase();
    if (!normalizedLabel) {
      return;
    }

    const user = await getAuthUser();
    if (!user) {
      return;
    }

    const { data, error } = await supabase
      .from("expedition_items")
      .insert([
        {
          user_id: user.id,
          sector_id: sectorId,
          label: normalizedLabel,
          is_manifested: false,
          priority,
        },
      ])
      .select("id,sector_id,label,is_manifested,technical_id,priority,created_at")
      .single();

    if (error || !data) {
      useSystemLogStore.getState().addLog("COMPONENT_APPEND_FAILED", "error");
      return;
    }

    set((state) => ({
      sectors: state.sectors.map((sector) =>
        sector.id === sectorId
          ? {
              ...sector,
              items: [...sector.items, data],
              totalCount: sector.totalCount + 1,
            }
          : sector
      ),
    }));
    useSystemLogStore.getState().addLog(`COMPONENT_BUFFERED:${normalizedLabel}`, "status");
    ArkanAudio.play("key_tick_mechanical");
  },

  deManifestItem: async (itemId: string) => {
    const state = get();
    const sector = state.sectors.find((candidate) => candidate.items.some((item) => item.id === itemId));
    const item = sector?.items.find((candidate) => candidate.id === itemId);

    if (!sector || !item) {
      return;
    }

    useSystemLogStore.getState().addLog(`INITIATING_DEMANIFESTATION:${item.technical_id}`, "status");
    ArkanAudio.play("ui_confirm_ping");

    const { error } = await supabase
      .from("expedition_items")
      .update({
        is_manifested: true,
        de_manifested_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (error) {
      useSystemLogStore.getState().addLog(`ITEM_TRANSFER_FAILED:${item.technical_id}`, "error");
      return;
    }

    set((current) => ({
      archivedCount: current.archivedCount + 1,
      sectors: current.sectors.map((candidate) =>
        candidate.id === sector.id
          ? {
              ...candidate,
              items: candidate.items.filter((entry) => entry.id !== itemId),
              manifestedCount: candidate.manifestedCount + 1,
            }
          : candidate
      ),
    }));
    useSystemLogStore.getState().addLog(`ITEM_TRANSFER_TO_ARCHIVE:SUCCESS // ${item.technical_id}`, "system");
  },

  getReadiness: () => computeExpeditionReadiness(get().sectors),
}));
