export type SoundCue =
  | 'click'
  | 'select'
  | 'add'
  | 'mastery'
  | 'start'
  | 'pause'
  | 'finish'
  | 'complete'
  | 'pass'
  | 'place'
  | 'unlock';

type Note = [frequency: number, delay: number, length: number, strength: number];
const scores: Record<SoundCue, Note[]> = {
  click: [[659.25, 0, 0.075, 0.42]],
  select: [
    [587.33, 0, 0.095, 0.38],
    [783.99, 0.035, 0.12, 0.28],
  ],
  add: [
    [523.25, 0, 0.15, 0.65],
    [783.99, 0.085, 0.22, 0.8],
  ],
  mastery: [
    [659.25, 0, 0.19, 0.6],
    [880, 0.11, 0.28, 0.8],
  ],
  start: [
    [392, 0, 0.17, 0.55],
    [587.33, 0.1, 0.3, 0.8],
  ],
  pause: [[440, 0, 0.22, 0.5]],
  finish: [
    [392, 0, 0.2, 0.5],
    [523.25, 0.115, 0.23, 0.65],
    [659.25, 0.23, 0.42, 0.75],
  ],
  complete: [
    [392, 0, 0.24, 0.58],
    [523.25, 0.13, 0.28, 0.65],
    [659.25, 0.27, 0.31, 0.72],
    [783.99, 0.44, 0.62, 0.82],
  ],
  pass: [
    [523.25, 0, 0.2, 0.6],
    [659.25, 0.13, 0.25, 0.7],
    [1046.5, 0.26, 0.52, 0.75],
  ],
  place: [
    [349.23, 0, 0.12, 0.45],
    [523.25, 0.07, 0.21, 0.65],
  ],
  unlock: [
    [392, 0, 0.3, 0.5],
    [587.33, 0.15, 0.34, 0.7],
    [783.99, 0.34, 0.65, 0.8],
  ],
};
let audio: AudioContext | undefined;
let lastPlace = 0;
let lastClick = 0;

/** Small synthesized cues; no assets, downloads, or sound on passive updates. */
export function playSound(cue: SoundCue, enabled = true, volume = 0.35) {
  if (!enabled || volume <= 0 || typeof window === 'undefined') return;
  if (cue === 'click') {
    if (performance.now() - lastClick < 45) return;
    lastClick = performance.now();
  }
  if (cue === 'place') {
    if (performance.now() - lastPlace < 90) return;
    lastPlace = performance.now();
  }
  try {
    audio ??= new AudioContext();
    const context = audio;
    const schedule = () => {
      const start = context.currentTime + 0.008;
      for (const [frequency, delay, length, strength] of scores[cue]) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start + delay);
        envelope.gain.setValueAtTime(0.0001, start + delay);
        envelope.gain.exponentialRampToValueAtTime(
          Math.max(0.0002, Math.min(1, volume) * 0.22 * strength),
          start + delay + 0.012,
        );
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + delay + length);
        oscillator.connect(envelope).connect(context.destination);
        oscillator.start(start + delay);
        oscillator.stop(start + delay + length + 0.02);
        const shimmer = context.createOscillator();
        const shimmerGain = context.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(frequency * 2.01, start + delay);
        shimmerGain.gain.setValueAtTime(0.0001, start + delay);
        shimmerGain.gain.exponentialRampToValueAtTime(
          Math.max(0.0002, Math.min(1, volume) * 0.032 * strength),
          start + delay + 0.014,
        );
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + delay + length * 0.72);
        shimmer.connect(shimmerGain).connect(context.destination);
        shimmer.start(start + delay);
        shimmer.stop(start + delay + length * 0.72 + 0.02);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
        shimmer.onended = () => {
          shimmer.disconnect();
          shimmerGain.disconnect();
        };
      }
    };
    if (context.state === 'suspended')
      void context
        .resume()
        .then(schedule)
        .catch(() => undefined);
    else schedule();
  } catch {
    // Audio is optional on devices that restrict Web Audio.
  }
}
