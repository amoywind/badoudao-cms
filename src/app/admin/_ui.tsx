'use client';

import { useState, useEffect } from 'react';

/**
 * True only once the component has mounted in the browser.
 *
 * Anything that reads the clock or a random number has to sit behind this.
 * The server rendered its copy at one moment and the browser renders at
 * another, so the two trees differ and React throws rather than patch the
 * difference — which lands the user on "Application error: a client-side
 * exception has occurred". The cost is one frame with the time-dependent
 * part omitted; the benefit is the admin is usable.
 *
 * The enquiries table used to compute "hours since this arrived" during
 * render, which meant every visit could crash on a row older than a day.
 *
 * Deliberately not a context: the admin layout is a server component, so a
 * provider would have to be threaded through every page by hand — and the
 * first page someone forgot would be the next one to crash. A module-level
 * flag with a subscriber list means any component can ask without wiring.
 */
let mounted = false;
const subscribers = new Set<(v: boolean) => void>();

function markMounted() {
  if (mounted) return;
  mounted = true;
  subscribers.forEach((fn) => fn(true));
}

if (typeof window !== 'undefined') {
  /* Subscribing during render would be a side effect; one microtask keeps
     it after commit without a component to hang it off. */
  queueMicrotask(markMounted);
}

export function useMounted() {
  const [, force] = useState(false);

  useEffect(() => {
    if (mounted) { force(true); return; }
    subscribers.add(force);
    markMounted();
    return () => { subscribers.delete(force); };
  }, []);

  return mounted;
}

export function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, kind = 'ok') {
    setToast({ msg, kind, id: Date.now() });
  }
  return { toast, show };
}

export function Toast({ toast }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      document.querySelectorAll('.toast').forEach((el) => el.remove());
    }, 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return <div className={`toast ${toast.kind}`}>{toast.msg}</div>;
}
