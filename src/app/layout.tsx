import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // <--- THIS IS THE MAGIC LINE

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KELH Manager V2',
  description: 'Hospital Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <div className='min-h-screen flex flex-col bg-slate-50 text-slate-900'>
          <main className='flex-1 w-full max-w-7xl mx-auto p-4 md:p-6'>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
