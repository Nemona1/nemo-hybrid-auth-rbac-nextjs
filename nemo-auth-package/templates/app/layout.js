import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './providers';
import { SidebarProvider } from '@/context/SidebarContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Nemo Auth - Enterprise Authentication System',
  description: 'Secure authentication with RBAC/PBAC hybrid permission system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SidebarProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: 'var(--success)',
                    secondary: 'var(--background)',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: 'var(--error)',
                    secondary: 'var(--background)',
                  },
                },
              }}
            />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}