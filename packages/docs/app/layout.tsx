import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="flex flex-col min-h-screen"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            forcedTheme: 'dark',
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
