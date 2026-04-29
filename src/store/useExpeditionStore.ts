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

function formatExpeditionError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.toUpperCase();
  }

  return "UNKNOWN_EXPEDITION_FAILURE";
}

interface ExpeditionState {
  sectors: ExpeditionSector[];
  archivedCount: number;
  isLoading: boolean;
  lastError: string | null;
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
  lastError: null,

  fetchManifest: async () => {
    set({ isLoading: true, lastError: null });

    try {
      const user = await getAuthUser();
      if (!user) {
        set({ sectors: [], archivedCount: 0, isLoading: false, lastError: "AUTH_SESSION_REQUIRED" });
        useSystemLogStore.getState().addLog("EXPEDITION_AUTH_SESSION_REQUIRED", "error");
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
        lastError: null,
      });
    } catch (error) {
      console.error("Error fetching expedition manifest:", error);
      const message = formatExpeditionError(error);
      set({ lastError: message });
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

    try {
      const user = await getAuthUser();
      if (!user) {
        set({ lastError: "AUTH_SESSION_REQUIRED" });
        useSystemLogStore.getState().addLog("EXPEDITION_AUTH_SESSION_REQUIRED", "error");
        return;
      }

      useSystemLogStore.getState().addLog(`ALLOCATING_NEW_SECTOR:${normalizedLabel}`, "system");

      const nextOrderIndex = get().sectors.reduce(
        (maxOrder, sector) => Math.max(maxOrder, sector.order_index),
        -1
      ) + 1;

      const { data, error } = await supabase
        .from("expedition_sectors")
        .insert([
          {
            label: normalizedLabel,
            user_id: user.id,
            order_index: nextOrderIndex,
          },
        ])
        .select("id,label,order_index")
        .single();

      if (error || !data) {
        throw error ?? new Error("SECTOR_INITIALIZATION_FAILED");
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
        ].sort((left, right) => left.order_index - right.order_index),
        lastError: null,
      }));
      ArkanAudio.play("system_execute_clack");
    } catch (error) {
      console.error("Error initializing expedition sector:", error);
      const message = formatExpeditionError(error);
      set({ lastError: message });
      useSystemLogStore.getState().addLog(`SECTOR_INITIALIZATION_FAILED:${message}`, "error");
    }
  },

  addComponent: async (sectorId: string, label: string, priority: ExpeditionPriority = "medium") => {
    const normalizedLabel = label.trim().toUpperCase();
    if (!normalizedLabel) {
      return;
    }

    try {
      const user = await getAuthUser();
      if (!user) {
        set({ lastError: "AUTH_SESSION_REQUIRED" });
        useSystemLogStore.getState().addLog("EXPEDITION_AUTH_SESSION_REQUIRED", "error");
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
        throw error ?? new Error("COMPONENT_APPEND_FAILED");
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
        lastError: null,
      }));
      useSystemLogStore.getState().addLog(`COMPONENT_BUFFERED:${normalizedLabel}`, "status");
      ArkanAudio.play("key_tick_mechanical");
    } catch (error) {
      console.error("Error buffering expedition component:", error);
      const message = formatExpeditionError(error);
      set({ lastError: message });
      useSystemLogStore.getState().addLog(`COMPONENT_APPEND_FAILED:${message}`, "error");
    }
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

    try {
      const { error } = await supabase
        .from("expedition_items")
        .update({
          is_manifested: true,
          de_manifested_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) {
        throw error;
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
        lastError: null,
      }));
      useSystemLogStore.getState().addLog(`ITEM_TRANSFER_TO_ARCHIVE:SUCCESS // ${item.technical_id}`, "system");
    } catch (error) {
      console.error("Error transferring expedition item to archive:", error);
      const message = formatExpeditionError(error);
      set({ lastError: message });
      useSystemLogStore.getState().addLog(`ITEM_TRANSFER_FAILED:${item.technical_id}:${message}`, "error");
    }
  },

  getReadiness: () => computeExpeditionReadiness(get().sectors),
}));
