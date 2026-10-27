import '../admin.css';
import type { Metadata } from 'next';

/**
 * The login screen has no business in a search result, and a "Badoudao
 * login" query in Google would be an invitation. robots.txt already
 * disallows /login; this is the page-level guarantee.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
