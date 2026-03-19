import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Grid,
  Volume2,
  Play,
  Pause,
  X,
  Terminal as TerminalIcon,
  Activity,
  Clock3,
  RotateCcw,
  Disc3,
  SlidersHorizontal,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArkanAudio } from '@/lib/audio/ArkanAudio';
import { POMODORO_PRESETS, clampAudioGain, clampBpm, computeSequenceCompletion, detectTimerMode, formatTimerValue } from '@/lib/timers';

interface ProtocolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (minutes: number) => void;
  currentValue: number;
}

interface SequenceItem {
  id: string;
  title: string;
  sub: string;
  total: number;
  remaining: number;
  active: boolean;
}

const TIME_SIGNATURES = ['1/1', '2/4', '3/4', '4/4', '6/8'] as const;
const TIMER_CIRCUMFERENCE = 301.6;

const TechnicalProtocolDialog = ({ isOpen, onClose, onConfirm, currentValue }: ProtocolDialogProps) => {
  const [value, setValue] = useState(Math.floor(currentValue / 60).toString());

  useEffect(() => {
    if (isOpen) {
      setValue(Math.max(1, Math.floor(currentValue / 60)).toString());
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/88 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden border border-primary/50 bg-[#040401] p-6 shadow-[0_0_45px_rgba(255,255,0,0.18)]">
        <PanelCorners />
        <div className="mb-6 flex items-center justify-between border-b border-primary/15 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/55">MODE: CALIBRATION_ENTRY</div>
            <h3 className="mt-2 text-sm font-black uppercase tracking-[0.24em] text-primary">PROTOCOL_CALIBRATION</h3>
          </div>
          <button onClick={onClose} className="text-primary/40 transition-colors hover:text-primary">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-primary/60">&gt; BUFFER_DURATION_MIN</span>
            <input
              type="number"
              min="1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border border-primary/25 bg-primary/5 px-4 py-4 font-mono text-3xl text-primary outline-none transition-colors placeholder:text-primary/20 focus:border-primary"
              autoFocus
            />
          </label>

          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/45">&gt; POMODORO_PRESETS</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {POMODORO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onConfirm(preset.minutes)}
                  className="border border-primary/18 bg-black/30 px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:border-primary hover:bg-primary/10"
                >
                  {preset.label} // {preset.minutes.toString().padStart(2, '0')}M
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => onConfirm(Math.max(1, parseInt(value, 10) || 25))}
              className="bg-primary px-4 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition-all hover:brightness-110"
            >
              COMMIT_RECONFIG
            </button>
            <button
              onClick={onClose}
              className="border border-primary/25 px-4 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary/8"
            >
              ABORT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TimersPage() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);

  const [bpm, setBpm] = useState(120);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [timeSignature, setTimeSignature] = useState<string>('4/4');
  const [isPulsing, setIsPulsing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const currentBeatRef = useRef(0);
  const beatQueueRef = useRef<{ time: number; beat: number }[]>([]);
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);
  const isMetronomeActiveRef = useRef(false);
  const tapTempoHistoryRef = useRef<number[]>([]);

  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const gainScrubberRef = useRef<HTMLDivElement>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [isDraggingGain, setIsDraggingGain] = useState(false);

  const timerSectionRef = useRef<HTMLElement | null>(null);
  const sequenceSectionRef = useRef<HTMLElement | null>(null);

  const [sequences, setSequences] = useState<SequenceItem[]>([
    { id: 'sync', title: 'SYSTEM_SYNC', sub: 'MAINTENANCE_SUBROUTINE', total: 10 * 60, remaining: 10 * 60, active: false },
    { id: 'dive', title: 'DEEP_DIVE', sub: 'FLOW_STATE_PROTOCOL', total: 90 * 60, remaining: 90 * 60, active: false },
    { id: 'cool', title: 'COOLDOWN', sub: 'THERMAL_REDUCTION', total: 5 * 60, remaining: 5 * 60, active: false },
  ]);

  const [audioGain, setAudioGain] = useState(0.85);
  const [syncAccuracy] = useState(99.8);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0] + 'Z';
    setLogs((prev) => [...prev.slice(-50), `${timestamp} // ${msg}`]);
  }, []);


  const timerModeLabel = useMemo(() => detectTimerMode(totalDuration), [totalDuration]);

  const timerProgress = useMemo(() => {
    if (!totalDuration) return 0;
    return 1 - timeLeft / totalDuration;
  }, [timeLeft, totalDuration]);

  const activeSequenceCount = useMemo(() => sequences.filter((sequence) => sequence.active).length, [sequences]);
  const clockLabel = useMemo(() => now.toLocaleTimeString('en-US', { hour12: false }), [now]);
  const cpuLabel = useMemo(() => `${String(4 + (isActive ? 3 : 0) + (isMetronomeActive ? 1 : 0) + activeSequenceCount).padStart(2, '0')}%`, [activeSequenceCount, isActive, isMetronomeActive]);
  const memoryLabel = useMemo(() => `${(3.1 + activeSequenceCount * 0.2 + (isMetronomeActive ? 0.3 : 0)).toFixed(1)}GB`, [activeSequenceCount, isMetronomeActive]);
  const networkLabel = useMemo(() => `${Math.max(3, 12 - (isMetronomeActive ? 3 : 0))}MS`, [isMetronomeActive]);
  const pulseLabel = isMetronomeActive ? 'SYNCHRONIZED' : 'STANDBY';
  const timerStateLabel = isActive ? 'PROTOCOL_ACTIVE' : 'PROTOCOL_STANDBY';
  const syncStateLabel = isMetronomeActive ? 'READY_SYNC' : 'AUDIO_PULSE_IDLE';

  const stopMetronome = useCallback((logMessage?: string) => {
    isMetronomeActiveRef.current = false;
    setIsMetronomeActive(false);
    setIsPulsing(false);
    beatQueueRef.current = [];

    if (timerIDRef.current !== null) {
      window.clearTimeout(timerIDRef.current);
      timerIDRef.current = null;
    }

    if (audioCtxRef.current?.state === 'running') {
      void audioCtxRef.current.suspend();
    }

    if (logMessage) addLog(logMessage);
  }, [addLog]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;

      const context = new AudioContextCtor();
      const masterGain = context.createGain();
      masterGain.gain.value = audioGain;
      masterGain.connect(context.destination);

      audioCtxRef.current = context;
      masterGainRef.current = masterGain;
    }

    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    return audioCtxRef.current;
  }, [audioGain]);
  const scheduleNote = useCallback((beatNumber: number, time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current) return;

    const osc = audioCtxRef.current.createOscillator();
    const envelope = audioCtxRef.current.createGain();
    const isAccent = beatNumber === 0;
    const decay = isAccent ? 0.04 : 0.025;

    osc.frequency.value = isAccent ? 1200 : 800;
    envelope.gain.setValueAtTime(isAccent ? 1 : 0.7, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + decay);

    osc.connect(envelope);
    envelope.connect(masterGainRef.current);
    osc.start(time);
    osc.stop(time + decay);

    beatQueueRef.current.push({ time, beat: beatNumber });
  }, []);

  const schedulerRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    timeSignatureRef.current = timeSignature;
  }, [timeSignature]);

  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
      masterGainRef.current.gain.setValueAtTime(audioGain, audioCtxRef.current.currentTime);
    }
  }, [audioGain]);

  useEffect(() => {
    addLog('INT_OS_BOOT');
    addLog('CLOCK_SYNC_OK');
    addLog('CORE_ACTIVE');
    addLog('METRO_BUFFER_STABLE');
  }, [addLog]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      ArkanAudio.playFast('system_engage');
      addLog('BUFFER_DEPLETED_ALARM_TRIGGERED');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, addLog]);

  useEffect(() => {
    let rafId: number;

    const checkPulse = () => {
      if (isMetronomeActiveRef.current && audioCtxRef.current) {
        const currentTime = audioCtxRef.current.currentTime;
        const activeBeat = beatQueueRef.current.find((beat) => currentTime >= beat.time && currentTime < beat.time + 0.1);
        setIsPulsing(Boolean(activeBeat));
        beatQueueRef.current = beatQueueRef.current.filter((beat) => beat.time + 0.1 > currentTime);
      } else {
        setIsPulsing(false);
      }

      rafId = requestAnimationFrame(checkPulse);
    };

    rafId = requestAnimationFrame(checkPulse);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    schedulerRef.current = () => {
      if (!audioCtxRef.current || !isMetronomeActiveRef.current) return;

      while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
        scheduleNote(currentBeatRef.current, nextNoteTimeRef.current);
        const secondsPerBeat = 60 / bpmRef.current;
        const beatsPerMeasure = parseInt(timeSignatureRef.current.split('/')[0], 10);

        nextNoteTimeRef.current += secondsPerBeat;
        currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasure;
      }

      timerIDRef.current = window.setTimeout(() => schedulerRef.current(), 25);
    };
  }, [scheduleNote]);

  useEffect(() => {
    const handlePointerUp = () => {
      setIsDraggingScrubber(false);
      setIsDraggingGain(false);
    };
    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      if (isDraggingScrubber && scrubberRef.current) {
        const rect = scrubberRef.current.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0]?.clientX ?? rect.left : event.clientX;
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const newBpm = clampBpm(30 + (x / rect.width) * 270);
        setBpm(newBpm);
      }

      if (isDraggingGain && gainScrubberRef.current) {
        const rect = gainScrubberRef.current.getBoundingClientRect();
        const clientX = 'touches' in event ? event.touches[0]?.clientX ?? rect.left : event.clientX;
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const nextGain = clampAudioGain(x / rect.width);
        setAudioGain(nextGain);
      }
    };

    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);

    return () => {
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [isDraggingGain, isDraggingScrubber]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSequences((prev) => prev.map((sequence) => {
        if (!sequence.active) return sequence;

        if (sequence.remaining > 1) {
          return { ...sequence, remaining: sequence.remaining - 1 };
        }

        ArkanAudio.playFast('system_engage');
        return { ...sequence, remaining: 0, active: false };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      stopMetronome();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
        masterGainRef.current = null;
      }
    };
  }, [stopMetronome]);

  const startTimer = () => {
    if (isActive) return;
    if (timeLeft === 0) {
      setTimeLeft(totalDuration);
    }
    setIsActive(true);
    ArkanAudio.playFast('key_tick_mechanical');
    addLog('PROTOCOL_ACTIVE');
  };

  const pauseTimer = () => {
    if (!isActive) return;
    setIsActive(false);
    ArkanAudio.playFast('key_tick_mechanical');
    addLog('PROTOCOL_STANDBY');
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalDuration);
    ArkanAudio.playFast('key_tick_mechanical');
    addLog('BUFFER_RESET');
  };

  const handleReconfig = (mins: number) => {
    const secs = mins * 60;
    setIsActive(false);
    setTotalDuration(secs);
    setTimeLeft(secs);
    setIsProtocolDialogOpen(false);
    addLog(`TEMPORAL_BUFFER_RECONFIGURED:${detectTimerMode(secs)} // ${mins}M`);
    ArkanAudio.playFast('system_engage');
  };

  const toggleMetronome = async () => {
    if (isMetronomeActiveRef.current) {
      stopMetronome('METRO_STOPPED');
      ArkanAudio.playFast('key_tick_mechanical');
      return;
    }

    const context = await ensureAudioContext();
    if (!context) return;

    isMetronomeActiveRef.current = true;
    setIsMetronomeActive(true);
    nextNoteTimeRef.current = context.currentTime;
    currentBeatRef.current = 0;
    schedulerRef.current();
    addLog('METRO_INIT');
    ArkanAudio.playFast('key_tick_mechanical');
  };

  const handleScrubberStart = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingScrubber(true);

    if (!scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const newBpm = clampBpm(30 + (x / rect.width) * 270);
    setBpm(newBpm);
  };

  const handleGainScrubberStart = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingGain(true);

    if (!gainScrubberRef.current) return;

    const rect = gainScrubberRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const nextGain = clampAudioGain(x / rect.width);
    setAudioGain(nextGain);
    ArkanAudio.playFast('key_tick_mechanical');
  };

  const handleTapTempo = () => {
    const nowMark = performance.now();
    const recentTaps = [...tapTempoHistoryRef.current.filter((mark) => nowMark - mark < 4000), nowMark];
    tapTempoHistoryRef.current = recentTaps;

    if (recentTaps.length >= 2) {
      const intervals = recentTaps.slice(1).map((mark, index) => mark - recentTaps[index]);
      const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      const nextBpm = clampBpm(60000 / average);
      setBpm(nextBpm);
      addLog(`TAP_SYNC_CALIBRATED: ${nextBpm}BPM`);
    } else {
      addLog('TAP_SYNC_BUFFERED');
    }

    ArkanAudio.playFast('key_tick_mechanical');
  };

  const toggleSequence = (id: string) => {
    setSequences((prev) => prev.map((sequence) => {
      if (sequence.id !== id) return sequence;

      const nextActive = !sequence.active;
      const nextRemaining = nextActive && sequence.remaining === 0 ? sequence.total : sequence.remaining;
      return { ...sequence, active: nextActive, remaining: nextRemaining };
    }));

    ArkanAudio.playFast('key_tick_mechanical');
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-black text-white font-mono selection:bg-primary selection:text-black">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,0,0.03)_1px,transparent_1px)] bg-[size:12px_12px] opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,0,0.08),transparent_22%),radial-gradient(circle_at_78%_65%,rgba(255,255,0,0.07),transparent_24%)]" />

      <TechnicalProtocolDialog
        isOpen={isProtocolDialogOpen}
        onClose={() => setIsProtocolDialogOpen(false)}
        onConfirm={handleReconfig}
        currentValue={timeLeft}
      />

      <header className="relative z-10 border-b border-primary/15 bg-black/85 backdrop-blur-sm">
        <div className="flex flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-black shadow-[0_0_20px_rgba(255,255,0,0.28)]">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.22em] text-primary">ARKAN_OS V2.4</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-primary/55">MODULE // CHRONOS_INTEGRATED_HUB</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-primary/70 md:gap-6 xl:justify-end">
            <StatusReadout label="SYSTEM" value="STABLE" />
            <StatusReadout label="CPU" value={cpuLabel} />
            <StatusReadout label="MEM" value={memoryLabel} />
            <StatusReadout label="NET" value={networkLabel} />
            <div className="hidden h-8 w-px bg-primary/15 xl:block" />
            <div className="text-xl font-black tracking-[0.18em] text-primary">{clockLabel}</div>
            <div className="flex h-11 w-11 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
              <span className="text-[11px] font-black tracking-[0.18em]">CH</span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-[72px] shrink-0 flex-col items-center justify-between border-r border-primary/10 bg-black/40 py-6 xl:flex">
          <div className="flex flex-col items-center gap-5">
            <RailButton icon={Grid} label="SEQ" onClick={() => sequenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
            <RailButton icon={Clock3} label="TIME" active onClick={() => timerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
            <RailButton icon={Disc3} label="TAP" onClick={handleTapTempo} />
            <RailButton icon={TerminalIcon} label="LOG" onClick={() => addLog('TERMINAL_HEARTBEAT')} />
          </div>
          <RailButton icon={SlidersHorizontal} label="CFG" onClick={() => setIsProtocolDialogOpen(true)} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-h-0 overflow-y-auto custom-scrollbar">
            <div className="grid gap-8 border-b border-primary/10 p-5 sm:p-6 md:p-8 2xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
              <section ref={timerSectionRef} className="relative overflow-hidden border border-primary/10 bg-black/35 p-6 sm:p-8">
                <PanelCorners />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary/45">
                    <div>CHRONOS_PRIMARY</div>
                    <div className="mt-2">MODE: {timerModeLabel}</div>
                    <div className="mt-1">STATUS: {syncStateLabel}</div>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-[0.22em] text-primary/40 sm:ml-auto sm:text-left">
                    <div>GEN: TEMPORAL_BUFFER</div>
                    <div className="mt-1">OUT: FOCUS_PROTOCOL</div>
                    <div className="mt-1">LATENCY: 0.0MS</div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center justify-center">
                  <div className={cn(
                    'relative flex aspect-square w-full max-w-[420px] items-center justify-center transition-transform duration-300',
                    isActive && 'scale-[1.01]'
                  )}>
                    <div className="absolute inset-[8%] rounded-full bg-primary/[0.03] blur-3xl" />
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="48" fill="transparent" stroke="rgba(255,255,0,0.08)" strokeWidth="1.1" />
                      <circle
                        cx="50"
                        cy="50"
                        r="48"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="square"
                        className="text-primary drop-shadow-[0_0_14px_rgba(255,255,0,0.7)] transition-all duration-700"
                        strokeDasharray={TIMER_CIRCUMFERENCE}
                        strokeDashoffset={TIMER_CIRCUMFERENCE - TIMER_CIRCUMFERENCE * timerProgress}
                      />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.42em] text-primary/38">TIMER_VALUE</div>
                      <button
                        type="button"
                        onClick={() => setIsProtocolDialogOpen(true)}
                        className="text-[70px] font-black leading-none tracking-[0.02em] text-primary drop-shadow-[0_0_20px_rgba(255,255,0,0.75)] transition-colors hover:text-white sm:text-[88px] lg:text-[96px]"
                      >
                        {formatTimerValue(timeLeft)}
                      </button>
                      <div className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-primary/72">
                        <span className={cn('h-2 w-2 rounded-full', isActive ? 'bg-primary shadow-[0_0_12px_rgba(255,255,0,0.85)]' : 'bg-primary/35')} />
                        {timerStateLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 w-full max-w-[420px] space-y-4">
                    <button
                      type="button"
                      onClick={startTimer}
                      disabled={isActive}
                      className={cn(
                        'w-full px-6 py-5 text-[13px] font-black uppercase tracking-[0.28em] transition-all',
                        isActive
                          ? 'cursor-default border border-primary/25 bg-primary/15 text-primary/55'
                          : 'bg-primary text-black shadow-[0_0_20px_rgba(255,255,0,0.24)] hover:brightness-110'
                      )}
                    >
                      {isActive ? '[ SEQUENCE_ACTIVE ]' : '[ START_SEQUENCE ]'}
                    </button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={pauseTimer}
                        className="flex items-center justify-center gap-2 border border-primary/25 px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary/10"
                      >
                        <Pause className="h-4 w-4" />
                        PAUSE
                      </button>
                      <button
                        type="button"
                        onClick={resetTimer}
                        className="flex items-center justify-center gap-2 border border-primary/25 px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary/10"
                      >
                        <RotateCcw className="h-4 w-4" />
                        RESET
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative overflow-hidden border border-primary/10 bg-black/35 p-6 sm:p-8">
                <PanelCorners />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="text-right text-[10px] uppercase tracking-[0.22em] text-primary/40 sm:ml-auto sm:text-left">
                    <div>GEN: TEMPORAL_RHYTHM</div>
                    <div className="mt-1">OUT: AUDIO_PULSE</div>
                    <div className="mt-1">LATENCY: 0.0MS</div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center">
                  <div className="mb-8 text-center">
                    <div className="text-[14px] font-black uppercase tracking-[0.42em] text-primary">RHYTHM_GEN</div>
                    <div className="mt-2 h-px w-14 bg-primary/35" />
                  </div>

                  <div className={cn(
                    'relative flex h-[260px] w-[260px] items-center justify-center rounded-full border border-primary/15 transition-all duration-300 sm:h-[280px] sm:w-[280px]',
                    isPulsing && 'border-primary/40 shadow-[0_0_35px_rgba(255,255,0,0.15)]'
                  )}>
                    <div className="absolute inset-3 rounded-full border border-dashed border-primary/14" />
                    <div className="absolute top-4 h-16 w-px bg-primary shadow-[0_0_12px_rgba(255,255,0,0.75)]" />
                    <div className="absolute bottom-4 h-4 w-px bg-primary/70" />
                    <div className={cn(
                      'absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(255,255,0,0.13),transparent_62%)] transition-opacity duration-150',
                      isPulsing ? 'opacity-100' : 'opacity-40'
                    )} />
                    <div className="relative z-10 text-center">
                      <div className={cn(
                        'text-[76px] font-black leading-none text-primary drop-shadow-[0_0_18px_rgba(255,255,0,0.72)] transition-transform duration-100',
                        isPulsing && 'scale-[1.05]'
                      )}>
                        {bpm}
                      </div>
                      <div className="mt-3 text-[11px] uppercase tracking-[0.36em] text-primary/55">BPM</div>
                    </div>
                  </div>

                  <div className="mt-8 grid w-full gap-2 sm:grid-cols-5">
                    {TIME_SIGNATURES.map((signature) => (
                      <button
                        key={signature}
                        onClick={() => {
                          setTimeSignature(signature);
                          ArkanAudio.playFast('key_tick_mechanical');
                        }}
                        className={cn(
                          'border px-3 py-3 text-[10px] font-black uppercase tracking-[0.22em] transition-all',
                          timeSignature === signature
                            ? 'border-primary bg-primary text-black shadow-[0_0_16px_rgba(255,255,0,0.2)]'
                            : 'border-primary/18 bg-black/35 text-primary/55 hover:border-primary/35 hover:text-primary'
                        )}
                      >
                        [{signature}]
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 w-full max-w-md space-y-3">
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.26em] text-primary/40">
                      <span>30_MIN</span>
                      <span>BPM_SCRUBBER</span>
                      <span>300_MAX</span>
                    </div>
                    <div
                      ref={scrubberRef}
                      className="group relative h-12 cursor-ew-resize border border-primary/12 bg-primary/[0.04]"
                      onMouseDown={handleScrubberStart}
                      onTouchStart={handleScrubberStart}
                    >
                      <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-primary/20" />
                      <div
                        className="absolute top-2 bottom-2 w-[3px] bg-primary shadow-[0_0_16px_rgba(255,255,0,0.75)] transition-all duration-75"
                        style={{ left: `calc(${((bpm - 30) / 270) * 100}% - 1px)` }}
                      >
                        <div className="absolute -left-[5px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(255,255,0,0.85)]" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid w-full max-w-xs grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleTapTempo}
                      className="flex flex-col items-center justify-center gap-2 rounded-full border border-primary/18 bg-black/30 px-4 py-5 text-primary transition-all hover:border-primary/40 hover:bg-primary/10"
                    >
                      <Disc3 className="h-5 w-5" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.22em]">TAP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleMetronome()}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-full border px-4 py-5 transition-all',
                        isMetronomeActive
                          ? 'border-primary bg-primary text-black shadow-[0_0_20px_rgba(255,255,0,0.2)]'
                          : 'border-primary/18 bg-black/30 text-primary hover:border-primary/40 hover:bg-primary/10',
                        isPulsing && isMetronomeActive && 'scale-105'
                      )}
                    >
                      <Volume2 className={cn('h-5 w-5', isMetronomeActive && 'animate-pulse')} />
                      <span className="text-[9px] font-bold uppercase tracking-[0.22em]">AUDIO</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <section ref={sequenceSectionRef} className="p-5 sm:p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <Grid className="h-4 w-4 text-primary/65" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.36em] text-primary">CUSTOM_SEQUENCES</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
                {sequences.map((sequence) => (
                  <button
                    key={sequence.id}
                    type="button"
                    onClick={() => toggleSequence(sequence.id)}
                    className={cn(
                      'relative overflow-hidden border border-primary/12 bg-black/35 p-5 text-left transition-all hover:border-primary/28 hover:bg-primary/[0.05]',
                      sequence.active && 'border-primary/38 bg-primary/[0.08] shadow-[0_0_22px_rgba(255,255,0,0.06)]'
                    )}
                  >
                    <PanelCorners compact />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={cn('text-[11px] font-black uppercase tracking-[0.18em]', sequence.active ? 'text-primary' : 'text-primary/75')}>
                          {sequence.title}
                        </div>
                        <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-primary/35">{sequence.sub}</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 text-primary/45">
                        <Play className={cn('h-3.5 w-3.5', sequence.active && 'animate-pulse text-primary')} />
                      </div>
                    </div>

                    <div className="mt-8 flex items-end justify-between gap-4">
                      <SequenceDial total={sequence.total} remaining={sequence.remaining} active={sequence.active} />
                      <div className="text-right">
                        <div className="text-[46px] font-black leading-none tracking-[0.02em] text-primary/85">{formatTimerValue(sequence.remaining)}</div>
                        <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-primary/35">STATUS: {sequence.active ? 'ACTIVE' : 'READY'}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </main>

          <aside className="flex min-h-0 flex-col border-t border-primary/10 bg-black/35 xl:border-l xl:border-t-0">
            <div className="border-b border-primary/10 p-6">
              <div className="mb-6 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary/60" />
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-primary/70">TELEMETRY_DATA</div>
              </div>
              <div className="space-y-5">
                <AdjustableTelemetryBar label="AUDIO_GAIN" value={audioGain.toFixed(2)} progress={audioGain * 100} scrubberRef={gainScrubberRef} onScrubStart={handleGainScrubberStart} />
                <TelemetryBar label="SYNC_ACCURACY" value={`${syncAccuracy}%`} progress={syncAccuracy} />
                <TelemetryBar label="ACTIVE_SEQUENCES" value={`${activeSequenceCount}`} progress={Math.min(100, activeSequenceCount * 34)} />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col border-b border-primary/10">
              <div className="flex items-center justify-between border-b border-primary/10 px-4 py-4">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4 text-primary/55" />
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-primary/55">TERMINAL_LOGS</span>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(255,255,0,0.75)]" />
              </div>
              <div className="min-h-[280px] flex-1 overflow-y-auto bg-black/85 p-4 custom-scrollbar xl:min-h-0">
                {logs.map((log, index) => {
                  const [stamp, message] = log.split(' // ');
                  return (
                    <div key={`${stamp}-${index}`} className="mb-3 flex gap-3 text-[10px] leading-tight">
                      <span className="w-6 shrink-0 text-primary/12">{String(index + 1).padStart(2, '0')}</span>
                      <span className="shrink-0 text-primary/32">[{stamp.replace('Z', '')}]</span>
                      <span className="text-primary/70">// {message}</span>
                    </div>
                  );
                })}
                <div ref={logEndRef} />
                <div className="animate-pulse text-primary/18">_</div>
              </div>
            </div>

            <div className="p-6">
              <OrbitalFeed pulseActive={isMetronomeActive} />
            </div>
          </aside>
        </div>
      </div>

      <footer className="relative z-10 flex flex-col gap-3 border-t border-primary/15 bg-black/85 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-primary/70 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-primary shadow-[0_0_6px_rgba(255,255,0,0.65)]" />
            <span>INTEGRATED_SYNC_NOMINAL</span>
          </div>
          <span className="text-primary/35">MODE: MULTI_TRACK</span>
          <span className="text-primary/35">OS_LINK: STABLE</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <span className="text-primary/35">PULSE: {pulseLabel}</span>
          <span className="text-primary/35">BUFFER: {Math.round((1 - timerProgress) * 100)}%</span>
          <span className="flex items-center gap-2 text-primary"><Zap className="h-3.5 w-3.5" /> RHYTHM_CHANNEL_READY</span>
        </div>
      </footer>
    </div>
  );
}

function StatusReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">*</span>
      <span className="text-primary/38">{label}:</span>
      <span className="text-primary">{value}</span>
    </div>
  );
}

function RailButton({ icon: Icon, label, onClick, active = false }: { icon: LucideIcon; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-14 w-14 flex-col items-center justify-center gap-1 border transition-all',
        active
          ? 'border-primary/55 bg-primary/10 text-primary shadow-[0_0_16px_rgba(255,255,0,0.08)]'
          : 'border-primary/12 bg-black/30 text-primary/45 hover:border-primary/30 hover:text-primary'
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[8px] font-bold uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function TelemetryBar({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
        <span className="text-primary/55">{label}</span>
        <span className="text-primary">{value}</span>
      </div>
      <div className="h-2 border border-primary/12 bg-primary/[0.05] p-[2px]">
        <div className="h-full bg-primary shadow-[0_0_12px_rgba(255,255,0,0.72)]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    </div>
  );
}

function AdjustableTelemetryBar({
  label,
  value,
  progress,
  scrubberRef,
  onScrubStart,
}: {
  label: string;
  value: string;
  progress: number;
  scrubberRef: React.RefObject<HTMLDivElement | null>;
  onScrubStart: (event: React.MouseEvent | React.TouchEvent) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
        <span className="text-primary/55">{label}</span>
        <span className="text-primary">{value}</span>
      </div>
      <div
        ref={scrubberRef}
        className="group relative h-2 cursor-ew-resize border border-primary/12 bg-primary/[0.05] p-[2px]"
        onMouseDown={onScrubStart}
        onTouchStart={onScrubStart}
      >
        <div className="h-full bg-primary/18" />
        <div className="absolute inset-y-[2px] left-[2px] bg-primary shadow-[0_0_12px_rgba(255,255,0,0.72)]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(255,255,0,0.8)]" style={{ left: `clamp(0px, calc(${Math.max(0, Math.min(100, progress))}% - 6px), calc(100% - 12px))` }} />
      </div>
    </div>
  );
}

function SequenceDial({ total, remaining, active }: { total: number; remaining: number; active: boolean }) {
  const completion = computeSequenceCompletion(total, remaining);
  const circumference = 113.1;

  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="transparent" stroke="rgba(255,255,0,0.08)" strokeWidth="1.5" />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={cn(active ? 'text-primary' : 'text-primary/45')}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - circumference * completion}
        />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/75">{Math.round(completion * 100)}%</span>
    </div>
  );
}

function OrbitalFeed({ pulseActive }: { pulseActive: boolean }) {
  return (
    <div className="relative overflow-hidden border border-primary/12 bg-black/80 p-4">
      <div className="mb-4 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-primary/45">
        <span>VISUAL_FEED</span>
        <span>{pulseActive ? 'LIVE_LINK' : 'ORBITAL_IDLE'}</span>
      </div>
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.9))]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:22px_22px] opacity-20" />
        <div className="absolute h-32 w-32 rounded-full border border-white/10 bg-[radial-gradient(circle_at_32%_30%,rgba(255,255,255,0.38),rgba(150,150,150,0.1)_35%,rgba(20,20,20,0.95)_68%)] shadow-[0_0_24px_rgba(255,255,255,0.08)]" />
        <div className="absolute h-36 w-36 rounded-full border border-primary/8" />
        <div className="absolute bottom-3 left-3 text-[8px] uppercase tracking-[0.18em] text-primary/28">LAT: 34.0522 N</div>
        <div className="absolute bottom-3 right-3 text-[8px] uppercase tracking-[0.18em] text-primary/28">PULSE: {pulseActive ? 'LOCKED' : 'IDLE'}</div>
      </div>
    </div>
  );
}

function PanelCorners({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <>
      <span className={cn('pointer-events-none absolute left-0 top-0 border-l-2 border-t-2 border-primary/85', size)} />
      <span className={cn('pointer-events-none absolute right-0 top-0 border-r-2 border-t-2 border-primary/85', size)} />
      <span className={cn('pointer-events-none absolute bottom-0 left-0 border-b-2 border-l-2 border-primary/85', size)} />
      <span className={cn('pointer-events-none absolute bottom-0 right-0 border-b-2 border-r-2 border-primary/85', size)} />
    </>
  );
}






