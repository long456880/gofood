import { createContext, useContext, useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// Stretches every loop in a scene by the same factor. Scaling delays too keeps
// the parts' relative phases intact, so slow motion is the same choreography,
// just easier to follow.
export const LoopSpeedContext = createContext(1);

// One linear 0→1 driver per animated part. Every visual detail is derived
// from it with the shaping helpers below, so a scene's parts can never drift
// out of sync with each other the way independent timers do.
export function useLoop(durationMs: number, delayMs = 0): SharedValue<number> {
  const stretch = useContext(LoopSpeedContext);
  const duration = durationMs * stretch;
  const delay = delayMs * stretch;
  const progress = useSharedValue(0);
  useEffect(() => {
    // Restart from 0: withRepeat replays from wherever it began, so starting
    // mid-loop after a speed change would clip every later cycle.
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
    );
    return () => cancelAnimation(progress);
  }, [duration, delay, progress]);
  return progress;
}

/* ---------------- timeline shaping ---------------- */

// Remaps the slice of the loop between `a` and `b` onto 0→1, flat outside it.
// Lets one driver run a multi-beat timeline (lift, then strike, then settle).
export function seg(t: number, a: number, b: number): number {
  'worklet';
  if (b <= a) return t >= b ? 1 : 0;
  const x = (t - a) / (b - a);
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// 0→1→0 across the window — for flashes, pops and impact squash.
export function bell(t: number, a: number, b: number): number {
  'worklet';
  return Math.sin(seg(t, a, b) * Math.PI);
}

/* ---------------- easing (worklets, usable inside animated styles) ---------------- */

export function easeIn(t: number): number {
  'worklet';
  return t * t * t;
}

export function easeOut(t: number): number {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Overshoots past the target then eases back — the "snap" that keeps motion
// from feeling machine-driven.
export function backOut(t: number): number {
  'worklet';
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Decaying oscillation, 0 at t=0 — the ring-out after an impact.
export function settle(t: number, cycles = 2): number {
  'worklet';
  return Math.sin(t * Math.PI * 2 * cycles) * Math.pow(1 - t, 2);
}

export function wobble(t: number, cycles: number): number {
  'worklet';
  return Math.sin(t * Math.PI * 2 * cycles);
}
