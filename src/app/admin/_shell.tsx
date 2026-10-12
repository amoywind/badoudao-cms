'use client';

/**
 * Client shell for the admin.
 *
 * The layout itself is a server component — it checks the session and
 * redirects before anything renders — so the boundary lives here, in a
 * client child, and every admin page below it is covered by one
 * component. That is deliberate: a boundary wired into each page is a
 * boundary someone forgets, and the pages that have crashed so far were
 * separate omissions waiting to happen.
 *
 * The retry works by remounting: `resetBoundary` swaps the key, which
 * throws away the crashed subtree and the error state with it. Passing a
 * new key to the boundary itself would not help, because the boundary is
 * what holds the error.
 *
 * Chinese copy: the only reader of this is the owner.
 */
import { useCallback, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [generation, setGeneration] = useState(0);

  /* Passed down through context-free means: the boundary renders its own
     retry, which calls this. */
  const reset = useCallback(() => setGeneration((g) => g + 1), []);

  return (
    <ErrorBoundaryWithRetry generation={generation} onRetry={reset}>
      {children}
    </ErrorBoundaryWithRetry>
  );
}

function ErrorBoundaryWithRetry({
  children,
  generation,
  onRetry
}: {
  children: React.ReactNode;
  generation: number;
  onRetry: () => void;
}) {
  return (
    <ErrorBoundary
      key={generation}
      lang="zh"
      label="admin"
      backHref="/admin"
      onRetry={onRetry}
    >
      {children}
    </ErrorBoundary>
  );
}