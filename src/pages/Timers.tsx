import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Grid, 
  ChevronUp, 
  ChevronDown, 
  Volume2, 
  Hand,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Terminal as TerminalIcon,
  Activity,
  Cpu,
  Zap,
  Timer as TimerIcon,
  LayoutGrid,
  FileText,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArkanAudio } from '@/lib/audio/ArkanAudio';

// --- Technical Protocol Dialog ---
interface ProtocolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (minutes: number) => void;
  currentValue: number;
}

const TechnicalProtocolDialog = ({ isOpen, onClose, onConfirm, currentValue }: ProtocolDialogProps) => {
  const [value, setValue] = useState(Math.floor(currentValue / 60).toString());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="w-80 bg-black border border-primary p-6 shadow-[0_0_50px_rgba(255,255,0,0.2)] font-mono">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">PROTOCOL_CALIBRATION</h3>
          <button onClick={onClose} className="text-primary/40 hover:text-primary transition-colors">
            <X size={14} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[8px] text-primary/60 uppercase tracking-widest">Buffer_Duration (MIN)</label>
            <input 
              type="number" 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-primary/5 border border-primary/20 text-primary p-3 font-mono text-xl focus:outline-none focus:border-primary transition-colors w-full"
              autoFocus
            />
          </div>
          
          <button 
            onClick={() => onConfirm(parseInt(value) || 25)}
            className="w-full py-3 bg-primary text-black font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all"
          >
            [ EXECUTE_RECONFIG ]
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function TimersPage() {
  // Main Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);

  // Metronome State
  const [bpm, setBpm] = useState(120);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const currentBeatRef = useRef(0);
  const beatQueueRef = useRef<{time: number, beat: number}[]>([]);
  const [isPulsing, setIsPulsing] = useState(false);

  // UI State
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  // Custom Sequences State
  const [sequences, setSequences] = useState([
    { id: 'sync', title: 'SYSTEM_SYNC', sub: 'Maintenance Subroutine', total: 10 * 60, remaining: 10 * 60, active: false },
    { id: 'dive', title: 'DEEP_DIVE', sub: 'Flow-State Protocol', total: 90 * 60, remaining: 90 * 60, active: false },
    { id: 'cool', title: 'COOLDOWN', sub: 'Thermal Reduction', total: 5 * 60, remaining: 5 * 60, active: false },
  ]);

  // Telemetry State
  const [audioGain, setAudioGain] = useState(0.85);
  const [syncAccuracy, setSyncAccuracy] = useState(99.8);

  // Logging Helper
  const addLog = useCallback((msg: string) => {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[1].split('.')[0] + 'Z';
    setLogs(prev => [...prev.slice(-50), `${timestamp} // ${msg}`]);
  }, []);

  useEffect(() => {
    addLog('INT_OS_BOOT');
    addLog('CLOCK_SYNC_OK');
    addLog('CORE_ACTIVE');
  }, [addLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Main Timer Logic ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      ArkanAudio.playFast('system_engage');
      addLog('BUFFER_DEPLETED_ALARM_TRIGGERED');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, addLog]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
    ArkanAudio.playFast('key_tick_mechanical');
    addLog(isActive ? 'PROTOCOL_STANDBY' : 'PROTOCOL_ACTIVE');
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalDuration);
    ArkanAudio.playFast('key_tick_mechanical');
    addLog('BUFFER_RESET');
  };

  const handleReconfig = (mins: number) => {
    const secs = mins * 60;
    setTotalDuration(secs);
    setTimeLeft(secs);
    setIsProtocolDialogOpen(false);
    addLog(`TEMPORAL_BUFFER_RECONFIGURED: ${mins}m`);
    ArkanAudio.playFast('system_engage');
  };

  // Visual Sync Loop
  useEffect(() => {
    let rafId: number;
    const checkPulse = () => {
      if (isMetronomeActive && audioCtxRef.current) {
        const currentTime = audioCtxRef.current.currentTime;
        const activeBeat = beatQueueRef.current.find(b => 
          currentTime >= b.time && currentTime < b.time + 0.1
        );
        setIsPulsing(!!activeBeat);
        beatQueueRef.current = beatQueueRef.current.filter(b => b.time + 0.1 > currentTime);
      } else {
        setIsPulsing(false);
        beatQueueRef.current = [];
      }
      rafId = requestAnimationFrame(checkPulse);
    };
    rafId = requestAnimationFrame(checkPulse);
    return () => cancelAnimationFrame(rafId);
  }, [isMetronomeActive]);

  // Web Audio Metronome Logic
  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const envelope = audioCtxRef.current.createGain();
    const isAccent = beatNumber === 0;
    osc.frequency.value = isAccent ? 1200 : 800;
    const decay = isAccent ? 0.04 : 0.025;
    envelope.gain.setValueAtTime(1, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + decay);
    osc.connect(envelope);
    envelope.connect(audioCtxRef.current.destination);
    osc.start(time);
    osc.stop(time + decay);
    beatQueueRef.current.push({ time, beat: beatNumber });
  };

  const scheduler = () => {
    if (!audioCtxRef.current) return;
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(currentBeatRef.current, nextNoteTimeRef.current);
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat;
      const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
      currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasure;
    }
    timerIDRef.current = window.setTimeout(scheduler, 25);
  };

  const toggleMetronome = () => {
    if (!isMetronomeActive) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      currentBeatRef.current = 0;
      scheduler();
      addLog('METRO_INIT');
    } else {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      addLog('METRO_STOPPED');
    }
    setIsMetronomeActive(!isMetronomeActive);
    ArkanAudio.playFast('key_tick_mechanical');
  };

  // Scrubber Logic
  const handleScrubberMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingScrubber) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const newBpm = Math.round(30 + (x / rect.width) * 270);
    setBpm(newBpm);
  };

  useEffect(() => {
    const handleUp = () => setIsDraggingScrubber(false);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  // Custom Sequences Independent Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setSequences(prev => prev.map(seq => {
        if (seq.active && seq.remaining > 0) {
          return { ...seq, remaining: seq.remaining - 1 };
        } else if (seq.active && seq.remaining === 0) {
          ArkanAudio.playFast('system_engage');
          return { ...seq, active: false };
        }
        return seq;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSequence = (id: string) => {
    setSequences(prev => prev.map(seq => 
      seq.id === id ? { ...seq, active: !seq.active } : seq
    ));
    ArkanAudio.playFast('key_tick_mechanical');
  };

  return (
    <div 
      className="root-container grid h-screen w-screen overflow-hidden bg-black text-white font-mono selection:bg-primary selection:text-black"
      style={{
        gridTemplateAreas: `
          "main telemetry"
          "main telemetry"
        `,
        gridTemplateColumns: '1fr 350px',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      <TechnicalProtocolDialog 
        isOpen={isProtocolDialogOpen}
        onClose={() => setIsProtocolDialogOpen(false)}
        onConfirm={handleReconfig}
        currentValue={timeLeft}
      />

      {/* [main]: Operational area */}
      <main 
        style={{ gridArea: 'main' }}
        className="grid grid-rows-[1fr_auto] overflow-y-auto custom-scrollbar bg-black min-w-0 border-r border-primary/10"
      >
        {/* Row A: Split View */}
        <div className="flex border-b border-primary/10 min-h-[400px]">
          {/* Left Side: Timer */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center border-r border-primary/10 relative group min-w-0">
            <div className="absolute top-4 left-4 text-[8px] text-primary/20 uppercase tracking-widest">TIMER_MODULE_01</div>
            <div className={cn(
              "relative flex items-center justify-center w-full max-w-[280px] aspect-square transition-all duration-1000",
              isActive ? "drop-shadow-[0_0_20px_rgba(255,255,0,0.3)]" : ""
            )}>
              <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                <circle className="text-primary/5" cx="50" cy="50" fill="transparent" r="48" stroke="currentColor" strokeWidth="0.5" />
                <circle 
                  className="text-primary transition-all duration-500 drop-shadow-[0_0_8px_#ffff00]" 
                  cx="50" cy="50" fill="transparent" r="48" 
                  stroke="currentColor" 
                  strokeDasharray="301.6" 
                  strokeDashoffset={301.6 - (301.6 * (timeLeft / totalDuration))} 
                  strokeLinecap="square" strokeWidth="1.5" 
                />
              </svg>
              <div className="relative flex flex-col items-center justify-center text-center">
                <div className="text-[9px] tracking-[0.4em] text-primary/30 mb-2 font-bold uppercase">REMAINING_BUFFER</div>
                <div 
                  onClick={() => setIsProtocolDialogOpen(true)}
                  className="text-7xl font-bold text-primary tracking-tighter tabular-nums drop-shadow-[0_0_15px_#ffff00] cursor-pointer hover:text-white transition-colors"
                >
                  {formatTime(timeLeft)}
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <button onClick={toggleTimer} className="px-5 py-1.5 bg-primary text-black text-[9px] font-bold uppercase tracking-widest hover:bg-white transition-colors">
                    {isActive ? 'ABORT' : 'START'}
                  </button>
                  <button onClick={resetTimer} className="px-5 py-1.5 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors">
                    RESET
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Metronome */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center relative min-w-0">
            <div className="absolute top-4 right-4 text-[8px] text-primary/20 uppercase tracking-widest">RHYTHM_GEN_01</div>
            <div className="w-full max-w-xs flex flex-col items-center gap-8">
              <div className="text-center">
                <div className="text-7xl font-bold text-primary tabular-nums drop-shadow-[0_0_15px_#ffff00] leading-none">{bpm}</div>
                <div className="text-[10px] text-primary/40 tracking-[0.5em] uppercase mt-3">BPM_PROTOCOL</div>
              </div>

              {/* Tactile Scrubber */}
              <div className="w-full flex flex-col gap-3">
                <div className="flex justify-between text-[8px] text-primary/30 uppercase tracking-widest">
                  <span>30_MIN</span>
                  <span>300_MAX</span>
                </div>
                <div 
                  className="w-full h-10 relative cursor-ew-resize group bg-primary/5 border-x border-primary/10"
                  onMouseDown={(e) => { setIsDraggingScrubber(true); handleScrubberMove(e); }}
                  onMouseMove={handleScrubberMove}
                  onTouchMove={handleScrubberMove}
                  onTouchStart={(e) => { setIsDraggingScrubber(true); handleScrubberMove(e); }}
                >
                  <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-primary/20 -translate-y-1/2"></div>
                  <div 
                    className="absolute top-0 h-full w-1 bg-primary shadow-[0_0_15px_#ffff00] transition-all duration-75"
                    style={{ left: `${((bpm - 30) / 270) * 100}%` }}
                  >
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_#ffff00]"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleMetronome}
                  className={cn(
                    "w-12 h-12 rounded-full border flex items-center justify-center transition-all group",
                    isMetronomeActive 
                      ? "bg-primary border-primary text-black shadow-[0_0_20px_#ffff00]" 
                      : "border-primary/20 text-primary hover:bg-primary/10"
                  )}
                >
                  <Volume2 size={20} className={cn(isMetronomeActive && "animate-pulse")} />
                </button>
                <div className="flex gap-2">
                  {['1/1', '2/4', '3/4', '4/4', '6/8'].map((sig) => (
                    <button 
                      key={sig}
                      onClick={() => {
                        setTimeSignature(sig);
                        ArkanAudio.playFast('key_tick_mechanical');
                      }}
                      className={cn(
                        "px-2 py-1 border text-[8px] font-bold tracking-tighter transition-all uppercase",
                        timeSignature === sig
                          ? "border-primary bg-primary text-black" 
                          : "border-primary/10 text-primary/40 hover:text-primary/60"
                      )}
                    >
                      {sig}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row B: CUSTOM_SEQUENCES Grid */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Grid size={14} className="text-primary/60" />
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">CUSTOM_SEQUENCES</h3>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {sequences.map((seq) => (
              <div 
                key={seq.id}
                onClick={() => toggleSequence(seq.id)}
                className={cn(
                  "border border-primary/10 p-5 bg-primary/[0.02] flex flex-col justify-between group cursor-pointer transition-all hover:bg-primary/[0.05]",
                  seq.active && "border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_rgba(255,255,0,0.05)]"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={cn("text-[11px] font-bold tracking-widest transition-colors", seq.active ? "text-primary" : "text-primary/60")}>{seq.title}</div>
                    <div className="text-[8px] text-primary/30 uppercase mt-1">{seq.sub}</div>
                  </div>
                  <PlayCircle size={16} className={cn("transition-colors", seq.active ? "text-primary animate-pulse" : "text-primary/20 group-hover:text-primary/40")} />
                </div>
                <div className="flex items-end justify-between mt-8">
                  <div className="text-2xl font-bold text-primary/80 tabular-nums leading-none">{formatTime(seq.remaining)}</div>
                  <div className="text-[8px] text-primary/20 uppercase">Status: {seq.active ? 'Active' : 'Ready'}</div>
                </div>
                <div className="mt-4 h-0.5 bg-primary/5 w-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/40 transition-all duration-1000"
                    style={{ width: `${((seq.total - seq.remaining) / seq.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* [telemetry]: Right sidebar */}
      <aside 
        style={{ gridArea: 'telemetry' }}
        className="flex flex-col bg-black overflow-hidden border-l border-primary/20 min-w-0"
      >
        {/* TELEMETRY_DATA */}
        <div className="p-6 border-b border-primary/10">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={14} className="text-primary/60" />
            <div className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.3em]">TELEMETRY_DATA</div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] uppercase tracking-widest">
                <span className="text-primary/40">Audio_Gain</span>
                <span className="text-primary">{audioGain.toFixed(2)}</span>
              </div>
              <div className="relative h-6 flex items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={audioGain}
                  onChange={(e) => setAudioGain(parseFloat(e.target.value))}
                  className="w-full h-1 bg-primary/10 rounded-full appearance-none cursor-pointer accent-primary shadow-[0_0_10px_rgba(255,255,0,0.2)]"
                />
                <div 
                  className="absolute left-0 h-1 bg-primary pointer-events-none shadow-[0_0_10px_#ffff00]"
                  style={{ width: `${audioGain * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] uppercase tracking-widest">
                <span className="text-primary/40">Sync_Accuracy</span>
                <span className="text-primary">{syncAccuracy}%</span>
              </div>
              <div className="h-1.5 bg-primary/10 w-full rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex-1 h-full transition-all duration-500",
                      i < (syncAccuracy / 5) ? "bg-primary shadow-[0_0_5px_#ffff00]" : "bg-primary/5"
                    )}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TERMINAL_LOGS */}
        <div className="flex-1 flex flex-col overflow-hidden bg-primary/[0.01]">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <TerminalIcon size={14} className="text-primary/40" />
              <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">TERMINAL_LOGS</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_#ffff00]"></div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-1 bg-black">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 text-[9px] font-mono leading-tight group">
                <span className="text-primary/10 w-6 shrink-0 group-hover:text-primary/30">{(i + 1).toString().padStart(3, '0')}</span>
                <span className="text-primary/30 shrink-0">{log.split(' // ')[0]}</span>
                <span className="text-primary/70">{log.split(' // ')[1]}</span>
              </div>
            ))}
            <div ref={logEndRef} />
            <div className="text-primary/20 animate-pulse ml-9">_</div>
          </div>
        </div>

        {/* VISUAL_FEED */}
        <div className="h-48 border-t border-primary/10 relative overflow-hidden group bg-black">
          <img 
            src="https://picsum.photos/seed/arkan-sat/600/400" 
            className="w-full h-full object-cover grayscale opacity-30 group-hover:opacity-50 transition-opacity duration-700"
            referrerPolicy="no-referrer"
            alt="Satellite Feed"
          />
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}></div>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-green-500/30 animate-scan shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            <div className="text-[8px] text-green-500 font-bold uppercase bg-black/60 px-1 tracking-tighter">VISUAL_FEED // SAT_LINK_09</div>
          </div>
          <div className="absolute bottom-2 right-2 text-[8px] text-primary/20 font-mono">
            LAT: 34.0522° N | LON: 118.2437° W
          </div>
        </div>
      </aside>
    </div>
  );
}
