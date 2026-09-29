import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'DD Copilot — AI Due Diligence',
  description: 'AI-powered financial due diligence and research platform',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
