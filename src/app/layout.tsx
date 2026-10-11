import './globals.css';
import './admin.css';

/**
 * Root layout metadata — defaults only.
 *
 * Every public route supplies its own title and description through
 * generateMetadata(); these values are the fallback for /admin, /login and
 * anything else that has none. They are deliberately generic: an earlier
 * version put the homepage copy here, which meant all eight public pages
 * emitted the same <title> and told Google they were the same document.
 */
export const metadata = {
  title: 'Badoudao',
  description: 'Quartz clock manufacturer.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
