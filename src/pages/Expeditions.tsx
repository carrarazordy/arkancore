import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Archive,
  CheckSquare,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Rocket,
  ShieldCheck,
  Square,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useExpeditionStore } from "@/store/useExpeditionStore";
import { useDialogStore } from "@/store/useDialogStore";
import { useSystemLogStore } from "@/store/useSystemLogStore";
import { useChronosStore } from "@/store/useChronosStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { cn } from "@/lib/utils";
import { deriveExpeditionIntel } from "@/lib/expeditions";

const SUB_NAV = [
  { label: "DASHBOARD", href: "/dashboard", icon: LayoutDashboard },
  { label: "EXPEDITIONS", href: "/expeditions", icon: Rocket },
  { label: "ARCHIVES", href: "/archive", icon: Archive },
];

export default function ExpeditionsPage() {
  const { sectors, isLoading, lastError, fetchManifest, initializeSector, addComponent, deManifestItem, getReadiness } = useExpeditionStore();
  const { openDialog } = useDialogStore();
  const logs = useSystemLogStore((state) => state.logs);
  const { cpuUsage, memUsage, netSpeed } = useChronosStore();
  const [manifestingIds, setManifestingIds] = useState<string[]>([]);
  const [coords, setCoords] = useState({ lat: "34.0522 N", lon: "118.2437 W" });
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    void fetchManifest();

    const clockInterval = window.setInterval(() => setClock(new Date()), 1000);
    const coordsInterval = window.setInterval(() => {
      setCoords((current) => {
        const latValue = parseFloat(current.lat) + (Math.random() - 0.5) * 0.0001;
        const lonValue = parseFloat(current.lon) + (Math.random() - 0.5) * 0.0001;

        return {
          lat: `${latValue.toFixed(4)} N`,
          lon: `${lonValue.toFixed(4)} W`,
        };
      });
    }, 3200);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(coordsInterval);
    };
  }, [fetchManifest]);

  const readiness = getReadiness();
  const intelFeed = useMemo(() => deriveExpeditionIntel(logs, sectors), [logs, sectors]);
  const totalActiveItems = useMemo(
    () => sectors.reduce((accumulator, sector) => accumulator + sector.items.length, 0),
    [sectors]
  );
  const subSector = sectors[0]?.label ?? "44-B_GAMMA";

  const handleInitializeSector = () => {
    openDialog({
      title: "INITIALIZE_NEW_COLONY_LIST",
      description: "DEFINE_SECTOR_ID_FOR_LOGISTICS_ALLOCATION",
      placeholder: "SECTOR_NAME...",
      confirmLabel: "COMMIT_LIST",
      onConfirm: async (value) => {
        if (value?.trim()) {
          await initializeSector(value);
        }
      },
    });
  };

  const handleAddComponent = (sectorId: string) => {
    openDialog({
      title: "ADD_COMPONENT",
      description: "SPECIFY_HARDWARE_OR_PROTOCOL_NODE",
      placeholder: "COMPONENT_NAME...",
      confirmLabel: "BUFFER_COMPONENT",
      onConfirm: async (value) => {
        if (value?.trim()) {
          await addComponent(sectorId, value);
        }
      },
    });
  };

  const handleManifestItem = async (itemId: string) => {
    setManifestingIds((current) => [...current, itemId]);
    try {
      await deManifestItem(itemId);
    } finally {
      setManifestingIds((current) => current.filter((entry) => entry !== itemId));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050605] text-[#eef85a]">
      <div className="border-b border-[#1d2108] bg-[#070805] px-5 py-4 lg:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-[#7b8426]">ARKAN_OS</p>
              <h1 className="mt-1 text-xl font-semibold uppercase tracking-[0.16em] text-white">TACTICAL_PLANNER_HUB</h1>
            </div>

            <nav className="flex items-center gap-2 border border-[#22250b] bg-[#0a0c05] p-1">
              {SUB_NAV.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.28em] transition-colors duration-200",
                    item.href === "/expeditions"
                      ? "border border-[#dce84d] bg-[#191c07] text-[#eef85a]"
                      : "text-[#66711f] hover:text-[#d9e55d]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.24em] text-[#cdd66b]">
            <div className="flex items-center gap-2">
              <span className="text-[#697120]">CPU:</span>
              <span>{cpuUsage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#697120]">MEM:</span>
              <span>{memUsage}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#697120]">NET:</span>
              <span>{netSpeed}</span>
            </div>
            <div className="border-l border-[#292d0f] pl-5 text-right">
              <p className="text-[#717923]">SYSTEM_TIME</p>
              <p className="mt-1 text-lg font-semibold tracking-[0.14em] text-white">{clock.toLocaleTimeString("en-US", { hour12: false })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 gap-5 overflow-hidden px-5 py-5 lg:px-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col overflow-hidden border border-[#1d2108] bg-[radial-gradient(circle_at_top,rgba(239,248,90,0.05),transparent_32%),linear-gradient(180deg,rgba(9,10,5,0.98),rgba(5,6,3,0.98))]">
          <div className="flex flex-col gap-5 border-b border-[#1d2108] px-6 py-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-5xl font-black uppercase tracking-[0.08em] text-white">EXPEDITION <span className="text-primary">//</span> CHECKLISTS</h2>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[12px] uppercase tracking-[0.32em] text-[#d6e063]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#dff03d] shadow-[0_0_12px_rgba(223,240,61,0.6)]" />
                  STATUS: ACTIVE_LOGISTIC_PLANNING
                </span>
                <span className="text-[#707823]">SUB-SECTOR: {subSector}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInitializeSector}
              className="inline-flex items-center justify-center gap-2 border border-[#eff84d] bg-[#eef84d] px-6 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#101305] transition-colors duration-200 hover:bg-[#fbff88]"
            >
              <Plus className="h-4 w-4" />
              INITIALIZE_NEW_COLONY_LIST
            </button>
          </div>

          {lastError ? (
            <div className="mx-6 mb-6 border border-[#6a2f1a] bg-[#1c0c08] px-4 py-4 text-[11px] uppercase tracking-[0.2em] text-[#f2b597]">
              CHECKLIST_SYNC_ALERT: {lastError}
            </div>
          ) : null}

          <div className="flex-1 overflow-auto px-6 py-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center border border-dashed border-[#353911] bg-[#090b04] text-[12px] uppercase tracking-[0.32em] text-[#9fa739]">
                <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
                SYNCING_MANIFEST
              </div>
            ) : sectors.length ? (
              <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {sectors.map((sector) => (
                    <motion.article
                      key={sector.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex min-h-[360px] flex-col border border-[#363b12] bg-[#090a04]"
                    >
                      <div className="flex items-center justify-between gap-4 border-b border-[#4c5218] px-5 py-4">
                        <h3 className="text-2xl font-semibold uppercase tracking-[0.16em] text-white">[ {sector.label} ]</h3>
                        <div className="border border-[#e3ef4d] bg-[#eef84d] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#111305]">
                          {sector.manifestedCount}/{sector.totalCount}_ITEMS
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <AnimatePresence mode="popLayout">
                          {sector.items.map((item) => {
                            const isManifesting = manifestingIds.includes(item.id);

                            return (
                              <motion.button
                                key={item.id}
                                layout
                                type="button"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                onClick={() => void handleManifestItem(item.id)}
                                onMouseEnter={() => ArkanAudio.playFast("key_tick_mechanical")}
                                disabled={isManifesting}
                                className={cn(
                                  "group flex items-center gap-4 border px-4 py-4 text-left transition-colors duration-200",
                                  isManifesting
                                    ? "cursor-wait border-[#5b611b] bg-[#121406] text-[#9da538]"
                                    : "border-[#2a2d0e] bg-[#111306] hover:border-[#e0eb49] hover:bg-[#171a08]"
                                )}
                              >
                                <div className="flex h-8 w-8 items-center justify-center border border-[#707722] bg-[#0c0d05] text-[#e8f24d]">
                                  {isManifesting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckSquare className="hidden h-4 w-4 group-hover:block" />}
                                  {!isManifesting ? <Square className="h-4 w-4 group-hover:hidden" /> : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#eef85a]">{item.label}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-[#7a8227]">
                                    <span>{item.technical_id}</span>
                                    <span className="border border-[#30340f] px-2 py-1">{item.priority}</span>
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </AnimatePresence>

                        {sector.items.length === 0 ? (
                          <div className="flex min-h-[180px] items-center justify-center border border-dashed border-[#2f340f] bg-[#0b0d05] px-4 text-center text-[11px] uppercase tracking-[0.26em] text-[#778024]">
                            LIST_READY // ADD THE FIRST COMPONENT TO START THIS CHECKLIST
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleAddComponent(sector.id)}
                          className="mt-auto border border-[#30340f] px-4 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#d5dd6a] transition-colors duration-200 hover:border-[#dbe74c] hover:bg-[#141706]"
                        >
                          + ADD_COMPONENT
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center border border-dashed border-[#31360f] bg-[#090b04]">
                <div className="text-center">
                  <Rocket className="mx-auto h-12 w-12 text-[#5f6720]" />
                  <p className="mt-5 text-[12px] uppercase tracking-[0.34em] text-[#9ea73d]">NO_ACTIVE_COLONY_LISTS</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#67701f]">
                    CREATE A LIST AND IT WILL APPEAR HERE IMMEDIATELY
                  </p>
                  <button
                    type="button"
                    onClick={handleInitializeSector}
                    className="mt-6 border border-[#dbe84d] px-5 py-3 text-[11px] uppercase tracking-[0.28em] text-[#eef85a] transition-colors duration-200 hover:bg-[#141706]"
                  >
                    INITIALIZE_FIRST_LIST
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="flex-1 border border-[#1d2108] bg-[#090a04]">
            <div className="flex items-center justify-between gap-4 border-b border-[#2d310f] px-5 py-4">
              <div>
                <p className="text-2xl font-semibold uppercase tracking-[0.18em] text-[#eef85a]">INBOX <span className="text-white">GLOBAL_INBOX</span></p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.28em] text-[#d7e25f]">{intelFeed.length}_NEW</span>
            </div>

            <div className="space-y-4 p-5">
              {intelFeed.map((entry) => (
                <div key={entry.id} className="border border-[#25290d] bg-[#0f1106] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#dfe94d]">{entry.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.24em] text-[#697121]">{entry.timestamp}</span>
                  </div>
                  <p className="mt-4 text-sm uppercase leading-7 tracking-[0.14em] text-[#8f9834]">{entry.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#1d2108] bg-[#090a04] p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#eff85a]">READINESS</h3>
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">{readiness.percentage}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden bg-[#1d2108]">
              <motion.div
                className="h-full bg-[#eef84d] shadow-[0_0_16px_rgba(238,248,77,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${readiness.percentage}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="border border-[#2a2e0f] bg-[#0e1005] p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#6d7522]">MANIFESTED</p>
                <p className="mt-3 text-3xl font-semibold tracking-[0.14em] text-[#eef85a]">{readiness.manifested.toString().padStart(2, "0")}</p>
              </div>
              <div className="border border-[#2a2e0f] bg-[#0e1005] p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#6d7522]">PENDING</p>
                <p className="mt-3 text-3xl font-semibold tracking-[0.14em] text-white">{readiness.pending.toString().padStart(2, "0")}</p>
              </div>
              <div className="border border-[#2a2e0f] bg-[#0e1005] p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#6d7522]">ACTIVE_LISTS</p>
                <p className="mt-3 text-3xl font-semibold tracking-[0.14em] text-white">{sectors.length.toString().padStart(2, "0")}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="border-t border-[#1d2108] bg-[#070805] px-5 py-3 text-[11px] uppercase tracking-[0.24em] text-[#727a23] lg:px-7">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 text-[#d8e15b]">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.55)]" />
              SYS_STABLE_VER_1.04
            </span>
            <span>ITEM_TRANSFER_TO_ARCHIVE: {readiness.manifested ? "SUCCESS" : "STANDBY"}</span>
            <span>SYNCING_WITH_ORBITAL_STATION_B4</span>
            <span>ACTIVE_ITEMS: {totalActiveItems.toString().padStart(2, "0")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>LAT: {coords.lat}</span>
            <span>LON: {coords.lon}</span>
            <span className="inline-flex items-center gap-2 text-[#eef85a]">
              <ShieldCheck className="h-4 w-4" />
              SECURE_LINK_ENCRYPTED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

