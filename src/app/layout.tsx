import './globals.css';
import './admin.css';

export const metadata = {
  title: 'Badoudao — Quartz Clock Manufacturer',
  description: 'OEM and ODM quartz clock manufacturer. Wall clocks, alarm clocks and movements. MOQ from 500 pieces.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
