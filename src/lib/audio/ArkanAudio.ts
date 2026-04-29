type AudioLevels = {
  master: number;
  keyboard: number;
  confirmation: number;
  ambient: number;
};

type SoundStep = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
};

const DEFAULT_LEVELS: AudioLevels = {
  master: 0.85,
  keyboard: 0.4,
  confirmation: 1,
  ambient: 0.15,
};

const SOUND_BANK: Record<string, SoundStep[]> = {
  silent_start: [{ frequency: 20, duration: 0.01, gain: 0.0001 }],
  ui_hover_shimmer: [{ frequency: 1320, slideTo: 1760, duration: 0.045, type: "sine", gain: 0.12 }],
  ui_click: [{ frequency: 520, slideTo: 760, duration: 0.055, type: "triangle", gain: 0.22 }],
  ui_back: [
    { frequency: 620, slideTo: 410, duration: 0.05, type: "triangle", gain: 0.2 },
    { frequency: 310, duration: 0.07, type: "sine", gain: 0.12 },
  ],
  ui_enter: [
    { frequency: 740, slideTo: 980, duration: 0.055, type: "sine", gain: 0.18 },
    { frequency: 1480, duration: 0.06, type: "triangle", gain: 0.12 },
  ],
  key_tick: [{ frequency: 920, duration: 0.025, type: "square", gain: 0.08 }],
  key_tick_mechanical: [
    { frequency: 480, duration: 0.025, type: "square", gain: 0.16 },
    { frequency: 960, duration: 0.025, type: "triangle", gain: 0.08 },
  ],
  confirm: [
    { frequency: 660, slideTo: 880, duration: 0.07, type: "sine", gain: 0.22 },
    { frequency: 1320, duration: 0.08, type: "triangle", gain: 0.1 },
  ],
  ui_confirm_ping: [
    { frequency: 880, duration: 0.06, type: "sine", gain: 0.18 },
    { frequency: 1760, duration: 0.08, type: "sine", gain: 0.1 },
  ],
  shimmer: [{ frequency: 980, slideTo: 1560, duration: 0.09, type: "sine", gain: 0.09 }],
  system_engage: [
    { frequency: 160, slideTo: 320, duration: 0.08, type: "sawtooth", gain: 0.12 },
    { frequency: 640, slideTo: 960, duration: 0.1, type: "triangle", gain: 0.14 },
  ],
  system_execute_clack: [
    { frequency: 220, duration: 0.035, type: "square", gain: 0.2 },
    { frequency: 1180, duration: 0.045, type: "triangle", gain: 0.12 },
  ],
  system_execute_clack_heavy: [
    { frequency: 130, duration: 0.055, type: "square", gain: 0.24 },
    { frequency: 760, duration: 0.06, type: "triangle", gain: 0.14 },
  ],
  system_purge: [
    { frequency: 360, slideTo: 120, duration: 0.12, type: "sawtooth", gain: 0.2 },
    { frequency: 90, duration: 0.08, type: "sine", gain: 0.12 },
  ],
  ui_modal_open: [
    { frequency: 420, slideTo: 840, duration: 0.08, type: "triangle", gain: 0.15 },
    { frequency: 1260, duration: 0.08, type: "sine", gain: 0.1 },
  ],
  ui_decline: [{ frequency: 520, slideTo: 260, duration: 0.08, type: "triangle", gain: 0.16 }],
  delete_chirp_back: [{ frequency: 700, slideTo: 240, duration: 0.08, type: "square", gain: 0.16 }],
  thump_hollow_space: [{ frequency: 95, slideTo: 70, duration: 0.1, type: "sine", gain: 0.18 }],
  restore_ascending_ping: [
    { frequency: 520, slideTo: 760, duration: 0.06, type: "sine", gain: 0.14 },
    { frequency: 1040, duration: 0.07, type: "sine", gain: 0.1 },
  ],
};

export class ArkanAudio {
  private static context: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static levels: AudioLevels = DEFAULT_LEVELS;
  private static lastHoverAt = 0;
  private static lastKeyAt = 0;

  static async unlock() {
    const context = this.ensureContext();
    if (context?.state === "suspended") {
      await context.resume();
    }
  }

  static play(soundId: string) {
    this.playPattern(soundId, false);
  }

  static playFast(soundId: string) {
    this.playPattern(soundId, true);
  }

  static playClick() {
    this.playPattern("ui_click", true);
  }

  static playHover() {
    const now = performance.now();
    if (now - this.lastHoverAt < 90) return;
    this.lastHoverAt = now;
    this.playPattern("ui_hover_shimmer", true, "keyboard");
  }

  static playBack() {
    this.playPattern("ui_back", true);
  }

  static playEnter() {
    this.playPattern("ui_enter", true);
  }

  static typing(event: KeyboardEvent) {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest("input, textarea, [contenteditable='true']")) return;

    const now = performance.now();
    if (now - this.lastKeyAt < 35) return;
    this.lastKeyAt = now;
    this.playPattern(event.key === "Enter" ? "ui_enter" : "key_tick", true, "keyboard");
  }

  static setAudioLevels(levels: Partial<AudioLevels>) {
    this.levels = {
      ...this.levels,
      ...levels,
      master: this.clamp(levels.master ?? this.levels.master),
      keyboard: this.clamp(levels.keyboard ?? this.levels.keyboard),
      confirmation: this.clamp(levels.confirmation ?? this.levels.confirmation),
      ambient: this.clamp(levels.ambient ?? this.levels.ambient),
    };

    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(this.levels.master, this.context.currentTime, 0.01);
    }
  }

  private static playPattern(soundId: string, fast: boolean, channel: keyof AudioLevels = "confirmation") {
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === "suspended") {
      void context.resume().then(() => this.playPattern(soundId, fast, channel));
      return;
    }
    if (context.state !== "running") return;

    const pattern = SOUND_BANK[soundId] ?? SOUND_BANK.ui_click;
    let cursor = context.currentTime;
    const speed = fast ? 0.78 : 1;

    pattern.forEach((step) => {
      this.scheduleStep(context, step, cursor, channel, speed);
      cursor += step.duration * speed * 0.72;
    });
  }

  private static scheduleStep(
    context: AudioContext,
    step: SoundStep,
    startTime: number,
    channel: keyof AudioLevels,
    speed: number
  ) {
    if (!this.masterGain) return;

    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    const duration = Math.max(0.01, step.duration * speed);
    const gain = (step.gain ?? 0.12) * this.levels.master * this.levels[channel];

    oscillator.type = step.type ?? "sine";
    oscillator.frequency.setValueAtTime(step.frequency, startTime);
    if (step.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, step.slideTo), startTime + duration);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3600, startTime);
    filter.frequency.exponentialRampToValueAtTime(1200, startTime + duration);

    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), startTime + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  private static ensureContext() {
    if (typeof window === "undefined") return null;

    if (!this.context) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;

      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.levels.master;
      this.masterGain.connect(this.context.destination);
    }

    return this.context;
  }

  private static clamp(value: number) {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  }
}
