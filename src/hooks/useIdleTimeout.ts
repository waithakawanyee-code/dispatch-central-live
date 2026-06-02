import { useEffect, useRef, useState } from "react";

interface Options {
  warnAfterMs: number;
  signOutAfterMs: number;
  onWarn: () => void;
  onTimeout: () => void;
  enabled?: boolean;
}

// Fires onWarn after `warnAfterMs` of idle, and onTimeout after `signOutAfterMs`.
// Activity resets both timers and dismisses the warning (caller can reset via returned reset()).
export function useIdleTimeout({
  warnAfterMs,
  signOutAfterMs,
  onWarn,
  onTimeout,
  enabled = true,
}: Options) {
  const warnRef = useRef<number | null>(null);
  const outRef = useRef<number | null>(null);
  const [warned, setWarned] = useState(false);

  const clear = () => {
    if (warnRef.current) window.clearTimeout(warnRef.current);
    if (outRef.current) window.clearTimeout(outRef.current);
  };

  const reset = () => {
    clear();
    setWarned(false);
    if (!enabled) return;
    warnRef.current = window.setTimeout(() => {
      setWarned(true);
      onWarn();
    }, warnAfterMs);
    outRef.current = window.setTimeout(() => {
      onTimeout();
    }, signOutAfterMs);
  };

  useEffect(() => {
    if (!enabled) {
      clear();
      return;
    }
    const handler = () => {
      if (!warned) reset();
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { warned, reset };
}
