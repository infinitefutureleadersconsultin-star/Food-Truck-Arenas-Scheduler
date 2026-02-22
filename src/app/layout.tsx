import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from './providers';

// Force dynamic rendering for all pages – Firebase requires runtime env vars
// that are not available during static generation at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Food Truck Arena Commissary',
  description:
    'Book and manage your commissary kitchen space at Food Truck Arena. Visual scheduling, real-time availability, and seamless check-in for food truck vendors.',
  keywords: [
    'food truck',
    'commissary',
    'kitchen booking',
    'scheduling',
    'food truck arena',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
