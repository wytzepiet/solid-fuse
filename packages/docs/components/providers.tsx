'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Pages follow the reader's theme, except the /ideas explorations, which were only ever designed dark. */
export function Providers({ children }: { children: ReactNode }) {
  const dark = usePathname().startsWith('/ideas');
  return (
    <RootProvider theme={{ defaultTheme: 'system', forcedTheme: dark ? 'dark' : undefined }}>
      {children}
    </RootProvider>
  );
}
