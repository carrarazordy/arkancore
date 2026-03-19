export type ExpeditionPriority = "low" | "medium" | "high" | "critical";

export interface ManifestSectorRow {
  id: string;
  label: string;
  order_index: number;
}

export interface ManifestItemRow {
  id: string;
  sector_id: string;
  label: string;
  is_manifested: boolean;
  technical_id: string;
  priority: ExpeditionPriority;
  created_at?: string;
}

export interface HydratedExpeditionSector extends ManifestSectorRow {
  items: ManifestItemRow[];
  manifestedCount: number;
  totalCount: number;
}

export interface ExpeditionReadiness {
  percentage: number;
  manifested: number;
  pending: number;
  total: number;
}

export interface ExpeditionIntelEntry {
  id: string;
  label: string;
  message: string;
  timestamp: string;
}

export function hydrateExpeditionManifest(
  rawSectors: ManifestSectorRow[],
  rawItems: ManifestItemRow[]
): HydratedExpeditionSector[] {
  return rawSectors.map((sector) => {
    const sectorItems = rawItems.filter((item) => item.sector_id === sector.id);
    const manifestedCount = sectorItems.filter((item) => item.is_manifested).length;
    const items = sectorItems.filter((item) => !item.is_manifested);

    return {
      ...sector,
      items,
      manifestedCount,
      totalCount: sectorItems.length,
    };
  });
}

export function computeExpeditionReadiness(sectors: HydratedExpeditionSector[]): ExpeditionReadiness {
  const manifested = sectors.reduce((accumulator, sector) => accumulator + sector.manifestedCount, 0);
  const total = sectors.reduce((accumulator, sector) => accumulator + sector.totalCount, 0);
  const pending = total - manifested;

  return {
    percentage: total > 0 ? Math.round((manifested / total) * 100) : 0,
    manifested,
    pending,
    total,
  };
}

export function deriveExpeditionIntel(
  logs: Array<{ id: string; message: string; timestamp: string }>,
  sectors: HydratedExpeditionSector[]
): ExpeditionIntelEntry[] {
  const dynamic = logs.slice(0, 3).map((log) => ({
    id: log.id,
    label: "LOGISTIC_UPDATE",
    message: log.message.replace(/^>>\s*/, "").replaceAll("_", " "),
    timestamp: log.timestamp,
  }));

  if (dynamic.length) {
    return dynamic;
  }

  const activeSector = sectors[0]?.label ?? "SECTOR_44_B_GAMMA";

  return [
    {
      id: "intel-1",
      label: "URGENT_INTEL",
      message: `${activeSector} WEATHER VARIANTS DETECTED. ADJUST CLOTHING MANIFEST.`,
      timestamp: "02:14",
    },
    {
      id: "intel-2",
      label: "LOGISTIC_UPDATE",
      message: "SUPPLY_DROP_SCHEDULED // T-MINUS 12_HOURS_UTC.",
      timestamp: "01:45",
    },
    {
      id: "intel-3",
      label: "PROTOCOL_ALPHA",
      message: "INITIALIZE_RECOVERY_PROTOCOLS_IN_CASE_OF_GRID_LOSS.",
      timestamp: "08:12",
    },
  ];
}
