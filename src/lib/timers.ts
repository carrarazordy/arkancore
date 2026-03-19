export interface PomodoroPreset {
  id: string;
  label: string;
  minutes: number;
  mode: string;
}

export const POMODORO_PRESETS: PomodoroPreset[] = [
  { id: "focus", label: "FOCUS", minutes: 25, mode: "POMODORO_FOCUS" },
  { id: "short", label: "SHORT_BREAK", minutes: 5, mode: "SHORT_BREAK" },
  { id: "long", label: "LONG_BREAK", minutes: 15, mode: "LONG_BREAK" },
];

export function formatTimerValue(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function detectTimerMode(totalDuration: number) {
  const minutes = Math.round(totalDuration / 60);
  return POMODORO_PRESETS.find((preset) => preset.minutes === minutes)?.mode ?? "ADJUSTABLE_QUANTUM";
}

export function clampBpm(value: number) {
  return Math.max(30, Math.min(300, Math.round(value)));
}

export function clampAudioGain(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function computeSequenceCompletion(total: number, remaining: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, (total - remaining) / total));
}
