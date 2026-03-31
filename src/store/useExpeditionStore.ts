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
import { getAuthUser, isAuthBypassed } from "@/lib/auth";

export type ExpeditionItem = ManifestItemRow;
export type ExpeditionSector = HydratedExpeditionSector;

const LOCAL_EXPEDITION_SECTORS: ExpeditionSector[] = hydrateExpeditionManifest(
  [
    { id: "local-sector-alpha", label: "ALPHA_NODE", order_index: 0 },
    { id: "local-sector-beta", label: "BETA_NODE", order_index: 1 },
  ],
  [
    {
      id: "local-item-1",
      sector_id: "local-sector-alpha",
      label: "SATCOM_ARRAY",
      is_manifested: false,
      technical_id: "SATCOM_ARRAY-001",
      priority: "high",
      created_at: new Date().toISOString(),
    },
    {
      id: "local-item-2",
      sector_id: "local-sector-alpha",
      label: "MEDICAL_KIT",
      is_manifested: true,
      technical_id: "MEDICAL_KIT-002",
      priority: "medium",
      created_at: new Date().toISOString(),
    },
    {
      id: "local-item-3",
      sector_id: "local-sector-beta",
      label: "POWER_CELLS",
      is_manifested: false,
      technical_id: "POWER_CELLS-003",
      priority: "critical",
      created_at: new Date().toISOString(),
    },
  ]
);

function createTechnicalId(label: string) {
  return `${label.replace(/[^A-Z0-9]+/g, "_")}-${Date.now().toString().slice(-6)}`;
}

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
      if (isAuthBypassed) {
        const readiness = computeExpeditionReadiness(LOCAL_EXPEDITION_SECTORS);
        set({
          sectors: LOCAL_EXPEDITION_SECTORS,
          archivedCount: readiness.manifested,
          isLoading: false,
        });
        return;
      }

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

    if (isAuthBypassed) {
      set((state) => ({
        sectors: [
          ...state.sectors,
          {
            id: `local-sector-${Date.now()}`,
            label: normalizedLabel,
            order_index: state.sectors.length,
            items: [],
            manifestedCount: 0,
            totalCount: 0,
          },
        ],
      }));
      useSystemLogStore.getState().addLog(`LOCAL_TEST_SECTOR_INITIALIZED:${normalizedLabel}`, "status");
      ArkanAudio.play("system_execute_clack");
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

    if (isAuthBypassed) {
      const item: ExpeditionItem = {
        id: `local-item-${Date.now()}`,
        sector_id: sectorId,
        label: normalizedLabel,
        is_manifested: false,
        technical_id: createTechnicalId(normalizedLabel),
        priority,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        sectors: state.sectors.map((sector) =>
          sector.id === sectorId
            ? {
                ...sector,
                items: [...sector.items, item],
                totalCount: sector.totalCount + 1,
              }
            : sector
        ),
      }));
      useSystemLogStore.getState().addLog(`LOCAL_TEST_COMPONENT_BUFFERED:${normalizedLabel}`, "status");
      ArkanAudio.play("key_tick_mechanical");
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

    if (isAuthBypassed) {
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
      useSystemLogStore.getState().addLog(`LOCAL_TEST_ARCHIVE_SUCCESS // ${item.technical_id}`, "system");
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
