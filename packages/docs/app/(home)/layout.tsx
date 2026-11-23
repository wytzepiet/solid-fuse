import type { ReactNode } from 'react';

/** The home page brings its own framed navigation, so the layout adds nothing. */
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
