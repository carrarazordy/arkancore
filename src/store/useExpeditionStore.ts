import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
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

const DEFAULT_EXPEDITION_SECTORS: ExpeditionSector[] = [
  {
    id: "local-sector-1",
    label: "SECTOR_44_B_GAMMA",
    order_index: 0,
    manifestedCount: 0,
    totalCount: 2,
    items: [
      {
        id: "local-item-1",
        sector_id: "local-sector-1",
        label: "FIELD_MEDKIT",
        is_manifested: false,
        technical_id: "EXP-001",
        priority: "high",
        created_at: new Date().toISOString(),
      },
      {
        id: "local-item-2",
        sector_id: "local-sector-1",
        label: "OFFLINE_NAV_PACKET",
        is_manifested: false,
        technical_id: "EXP-002",
        priority: "medium",
        created_at: new Date().toISOString(),
      },
    ],
  },
];

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

export const useExpeditionStore = create<ExpeditionState>()(
  persist(
    (set, get) => ({
  sectors: DEFAULT_EXPEDITION_SECTORS,
  archivedCount: 0,
  isLoading: false,
  lastError: null,

  fetchManifest: async () => {
    set({ isLoading: true, lastError: null });

    try {
      if (!hasSupabaseConfig) {
        set({ isLoading: false, lastError: "LOCAL_MODE_NO_SUPABASE_CONFIG" });
        useSystemLogStore.getState().addLog("EXPEDITION_LOCAL_MODE_ACTIVE", "warning");
        return;
      }

      const user = await getAuthUser();
      if (!user) {
        set({ isLoading: false, lastError: "LOCAL_MODE_AUTH_SESSION_MISSING" });
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
      if (!hasSupabaseConfig) {
        const nextOrderIndex = get().sectors.reduce(
          (maxOrder, sector) => Math.max(maxOrder, sector.order_index),
          -1
        ) + 1;

        set((state) => ({
          sectors: [
            ...state.sectors,
            {
              id: crypto.randomUUID(),
              label: normalizedLabel,
              order_index: nextOrderIndex,
              items: [],
              manifestedCount: 0,
              totalCount: 0,
            },
          ],
          lastError: "LOCAL_MODE_NO_SUPABASE_CONFIG",
        }));
        ArkanAudio.play("system_execute_clack");
        return;
      }

      const user = await getAuthUser();
      if (!user) {
        const nextOrderIndex = get().sectors.reduce(
          (maxOrder, sector) => Math.max(maxOrder, sector.order_index),
          -1
        ) + 1;
        set((state) => ({
          sectors: [
            ...state.sectors,
            {
              id: crypto.randomUUID(),
              label: normalizedLabel,
              order_index: nextOrderIndex,
              items: [],
              manifestedCount: 0,
              totalCount: 0,
            },
          ],
          lastError: "LOCAL_MODE_AUTH_SESSION_MISSING",
        }));
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
      if (!hasSupabaseConfig) {
        set((state) => ({
          sectors: state.sectors.map((sector) =>
            sector.id === sectorId
              ? {
                  ...sector,
                  items: [
                    ...sector.items,
                    {
                      id: crypto.randomUUID(),
                      sector_id: sectorId,
                      label: normalizedLabel,
                      is_manifested: false,
                      technical_id: `EXP-${String(sector.totalCount + 1).padStart(3, "0")}`,
                      priority,
                      created_at: new Date().toISOString(),
                    },
                  ],
                  totalCount: sector.totalCount + 1,
                }
              : sector
          ),
          lastError: "LOCAL_MODE_NO_SUPABASE_CONFIG",
        }));
        useSystemLogStore.getState().addLog(`LOCAL_COMPONENT_BUFFERED:${normalizedLabel}`, "status");
        ArkanAudio.play("key_tick_mechanical");
        return;
      }

      const user = await getAuthUser();
      if (!user) {
        set((state) => ({
          sectors: state.sectors.map((sector) =>
            sector.id === sectorId
              ? {
                  ...sector,
                  items: [
                    ...sector.items,
                    {
                      id: crypto.randomUUID(),
                      sector_id: sectorId,
                      label: normalizedLabel,
                      is_manifested: false,
                      technical_id: `EXP-${String(sector.totalCount + 1).padStart(3, "0")}`,
                      priority,
                      created_at: new Date().toISOString(),
                    },
                  ],
                  totalCount: sector.totalCount + 1,
                }
              : sector
          ),
          lastError: "LOCAL_MODE_AUTH_SESSION_MISSING",
        }));
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
      if (!hasSupabaseConfig || item.id.startsWith("local-")) {
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
          lastError: hasSupabaseConfig ? current.lastError : "LOCAL_MODE_NO_SUPABASE_CONFIG",
        }));
        useSystemLogStore.getState().addLog(`LOCAL_ITEM_ARCHIVED:${item.technical_id}`, "system");
        return;
      }

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
    }),
    {
      name: "arkan-expeditions",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        sectors: state.sectors,
        archivedCount: state.archivedCount,
      }),
    }
  )
);
