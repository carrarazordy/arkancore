import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare, Square, Zap, Activity, Globe, ShieldCheck } from "lucide-react";
import { useExpeditionStore, ExpeditionItem } from "@/store/useExpeditionStore";
import { useDialogStore } from "@/store/useDialogStore";
import { ArkanAudio } from "@/lib/audio/ArkanAudio";
import { cn } from "@/lib/utils";
import { useSystemLogStore } from "@/store/useSystemLogStore";

export default function ExpeditionsPage() {
  const { sectors, fetchManifest, initializeSector, addComponent, deManifestItem, getReadiness } = useExpeditionStore();
  const { openDialog } = useDialogStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [glitchingItems, setGlitchingItems] = useState<string[]>([]);
  const { logs } = useSystemLogStore();

  const [coords, setCoords] = useState({ lat: "34.0522 N", lon: "118.2437 W" });

  useEffect(() => {
    fetchManifest();
    
    // Simulate real-time coordinate updates
    const interval = setInterval(() => {
      setCoords(prev => {
        const latVal = parseFloat(prev.lat) + (Math.random() - 0.5) * 0.0001;
        const lonVal = parseFloat(prev.lon) + (Math.random() - 0.5) * 0.0001;
        return {
          lat: `${latVal.toFixed(4)} N`,
          lon: `${lonVal.toFixed(4)} W`
        };
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [fetchManifest]);

  const handleInitializeSector = () => {
    openDialog({
      title: "INITIALIZE_COLONY_LIST",
      description: "DEFINE_SECTOR_ID_FOR_LOGISTICS_ALLOCATION",
      placeholder: "SECTOR_NAME...",
      onConfirm: async (val) => {
        if (val) {
          await initializeSector(val);
          // Scroll to end
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTo({
                left: scrollContainerRef.current.scrollWidth,
                behavior: 'smooth'
              });
            }
          }, 100);
        }
      }
    });
  };

  const handleAddComponent = (sectorId: string) => {
    openDialog({
      title: "ADD_COMPONENT",
      description: "SPECIFY_HARDWARE_OR_PROTOCOL_NODE",
      placeholder: "COMPONENT_NAME...",
      onConfirm: (val) => {
        if (val) addComponent(sectorId, val);
      }
    });
  };

  const handleCheck = async (itemId: string) => {
    setGlitchingItems(prev => [...prev, itemId]);
    await deManifestItem(itemId);
    
    // Remove from UI after animation
    setTimeout(() => {
      useExpeditionStore.setState(state => ({
        sectors: state.sectors.map(s => ({
          ...s,
          items: s.items.filter(i => i.id !== itemId)
        }))
      }));
      setGlitchingItems(prev => prev.filter(id => id !== itemId));
    }, 400);
  };

  // Readiness calculation
  const { percentage: readiness, manifested: archivedCount, total: totalItems } = getReadiness();
  const allItemsCount = sectors.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="h-full flex flex-col bg-black font-mono overflow-hidden relative">
      {/* Page Title Overlay */}
      <div className="absolute top-8 left-8 z-20 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-[0.4em] text-primary uppercase drop-shadow-[0_0_10px_rgba(249,249,6,0.3)]">
          LOGISTICS // PENDING
        </h1>
      </div>

      {/* Main Content - Horizontal Scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden flex p-8 pt-24 gap-6 custom-scrollbar snap-x snap-mandatory md:snap-none"
      >
        <AnimatePresence mode="popLayout">
          {sectors.map((sector) => (
            <motion.div
              key={sector.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-[320px] shrink-0 flex flex-col border border-primary/20 bg-primary/[0.02] relative group snap-center"
            >
              {/* Sector Header */}
              <div className="p-4 border-b border-primary/10 flex justify-between items-center bg-primary/40">
                <h2 className="text-sm font-bold text-black tracking-widest uppercase">
                  [ {sector.label} ]
                </h2>
                <div className="px-2 py-0.5 bg-black/20 border border-black/20 rounded text-[9px] text-black font-bold">
                  {sector.items.length} ITEMS
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {sector.items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onMouseEnter={() => ArkanAudio.playFast('key_tick_mechanical')}
                      className={cn(
                        "group/item flex items-center gap-4 p-4 bg-black/40 border border-primary/10 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden",
                        glitchingItems.includes(item.id) && "animate-glitch-fade-out pointer-events-none"
                      )}
                      onClick={() => handleCheck(item.id)}
                    >
                      <div className="shrink-0 text-primary/40 group-hover/item:text-primary transition-colors">
                        <Square size={20} className="group-hover/item:hidden" />
                        <CheckSquare size={20} className="hidden group-hover/item:block" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white tracking-tight uppercase truncate group-hover/item:text-primary transition-colors">
                          {item.label}
                        </p>
                      </div>
                      
                      {/* Technical ID overlay on hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-20 transition-opacity">
                        <span className="text-[8px] text-primary font-mono">{item.technical_id}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Item Button */}
                <button
                  onClick={() => handleAddComponent(sector.id)}
                  className="w-full py-4 border border-dashed border-primary/20 text-[10px] font-bold text-primary/40 hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Plus size={12} />
                  ADD_COMPONENT
                </button>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </AnimatePresence>

        {sectors.length === 0 && (
          <div className="flex-1 flex items-center justify-center border border-dashed border-primary/10 rounded-lg">
            <div className="text-center">
              <Zap size={48} className="text-primary/10 mx-auto mb-4" />
              <p className="text-primary/30 text-xs tracking-[0.5em] uppercase">NO_SECTORS_INITIALIZED</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Telemetry */}
      <footer className="h-16 border-t border-primary/20 bg-black flex items-center justify-between px-8 shrink-0 relative z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">SYS_STABLE</span>
          </div>
          
          <div className="h-4 w-px bg-primary/10" />

          <div className="flex items-center gap-4 max-w-md overflow-hidden">
            <span className="text-[10px] text-primary/40 font-mono truncate">
              &gt; {logs[0]?.message || "SYSTEM_STANDBY // WAITING_FOR_INPUT..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6 text-[10px] font-mono">
            <div className="flex gap-2">
              <span className="text-primary/40 uppercase">LAT:</span>
              <span className="text-primary">{coords.lat}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary/40 uppercase">LON:</span>
              <span className="text-primary">{coords.lon}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">SECURE_LINK</span>
          </div>
        </div>
      </footer>

      {/* Readiness Widget - Bottom Right */}
      <div className="absolute bottom-24 right-8 w-80 bg-black/80 border border-primary/30 p-6 backdrop-blur-xl z-50 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
            EXPEDITION_STATUS
            <Activity size={12} className="animate-pulse" />
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[10px] mb-2">
              <span className="text-white/40 uppercase">READINESS</span>
              <span className="text-primary font-bold">{readiness}%</span>
            </div>
            <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_15px_#ffff00]"
                initial={{ width: 0 }}
                animate={{ width: `${readiness}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 border border-primary/10 p-3">
              <span className="text-[8px] text-primary/40 uppercase block mb-1">MANIFESTED</span>
              <span className="text-2xl font-bold text-primary">{archivedCount.toString().padStart(2, '0')}</span>
            </div>
            <div className="bg-primary/5 border border-primary/10 p-3">
              <span className="text-[8px] text-primary/40 uppercase block mb-1">PENDING</span>
              <span className="text-2xl font-bold text-white">{allItemsCount.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
