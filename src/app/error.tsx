'use client';

/**
 * Route-level fallback for anything a page throws.
 *
 * Wrapped in an ErrorBoundary of its own so the boundary itself has a
 * boundary: if the fallback renders something the browser dislikes, the
 * owner gets a plain string rather than the blank page this exists to
 * prevent. The audience here is a buyer who has not logged in, so the
 * copy is English and offers a way back to the catalogue.
 */
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page error]', error.message, error.digest || '');
  }, [error]);

  return (
    <ErrorBoundary lang="en" label={typeof window !== 'undefined' ? window.location.pathname : ''}>
      <div className="eb">
        <div className="eb-in">
          <h2>This page did not load correctly</h2>
          <p className="eb-msg">
            The page hit an error while loading. Browsing the rest of the site
            will work, or you can try this one again.
          </p>
          <div className="eb-act">
            <button className="btn btn-primary" onClick={reset}>Try again</button>
            <a className="btn btn-ghost" href="/products">Browse clocks</a>
            <a className="btn btn-ghost" href="/contact">Contact us</a>
          </div>
          {error.digest && <p className="eb-digest">ref: {error.digest}</p>}
        </div>
      </div>
    </ErrorBoundary>
  );
}
