import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KELH Manager',
  description: 'Hospital Management System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={poppins.variable}>
      <body>
        <div className='min-h-screen flex flex-col' style={{ backgroundColor: 'var(--ios-bg)' }}>
          <Header />
          <main className='flex-1 w-full max-w-[1200px] mx-auto px-4 py-5 sm:px-6 md:px-8 md:py-7'>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
