'use client';

import { useState, useEffect } from 'react';

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
    const t = setTimeout(() => onDone(), 2600);
    function onDone() {
      document.querySelectorAll('.toast').forEach((el) => el.remove());
    }
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return <div className={`toast ${toast.kind}`}>{toast.msg}</div>;
}
