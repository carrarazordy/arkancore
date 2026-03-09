export class ArkanAudio {
  static play(soundId: string) {
    console.log(`[AUDIO] Playing: ${soundId}`);
  }
  static playFast(soundId: string) {
    console.log(`[AUDIO] Playing fast: ${soundId}`);
  }
  static playClick() {
    console.log(`[AUDIO] Click`);
  }
  static playHover() {
    // console.log(`[AUDIO] Hover`);
  }
  static typing(e: KeyboardEvent) {
    // console.log(`[AUDIO] Typing`);
  }
  static setAudioLevels(levels: any) {
    console.log(`[AUDIO] Levels set:`, levels);
  }
}
