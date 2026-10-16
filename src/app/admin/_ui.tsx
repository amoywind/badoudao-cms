'use client';

import { useState, useEffect, useCallback } from 'react';

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
    /* A monotonic counter rather than a timestamp. Two toasts raised in
       the same millisecond would share an id, React would see identical
       state, and the second message would never render — the confirmation
       an admin just triggered would silently not appear. */
    setToast((prev) => ({ msg, kind, id: (prev?.id || 0) + 1 }));
  }
  /* useCallback, not a plain function. Toast's effect depends on dismiss;
     a new function identity on every render would clear and restart the
     2.6s timer every render, and the toast would never go away. */
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

export function Toast({ toast, dismiss }) {
  useEffect(() => {
    if (!toast) return;
    /* Clear state, never touch the node.

       This used to be document.querySelectorAll('.toast') followed by
       el.remove() after 2.6s. React was not told: the div it had rendered
       vanished from the parent it still held a reference to, and the next
       render that tried to unmount it threw "Failed to execute 'removeChild'
       on 'Node': The node to be removed is not a child of this node." It
       appeared as a full-page crash right after saving a category, because
       saving closes the form at the same moment the toast is up — the two
       unmounts raced. Every admin page that shows a toast was affected, not
       just this one.

       dismiss is passed in from useToast so this stays React's job. */
    const t = setTimeout(() => dismiss && dismiss(toast.id), 2600);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;
  return <div className={`toast ${toast.kind}`}>{toast.msg}</div>;
}
