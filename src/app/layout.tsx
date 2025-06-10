
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { Suspense } from 'react';
import InstallPWAButton from '@/components/pwa/InstallPWAButton'; // Import the PWA button

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Mentos 2.0',
  description: 'Modern application built with Next.js, TanStack Query, Shadcn UI, Axios, and Zod.',
  manifest: '/manifest.json', // Link to the manifest file
  appleWebApp: { // For iOS PWA behavior
    capable: true,
    statusBarStyle: 'default',
    title: 'Mentos 2.0',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6', // Matches manifest.json theme_color (Primary Blue)
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense>
          <AppProviders>
          {children}
          <Toaster />
          <InstallPWAButton /> 
        </AppProviders>
        </Suspense> 
      </body>
    </html>
  );
}
