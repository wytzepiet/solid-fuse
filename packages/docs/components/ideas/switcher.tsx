'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ideas = [
  { href: '/ideas/loop', label: 'Loop' },
  { href: '/ideas/poster', label: 'Poster' },
  { href: '/ideas/seam', label: 'Seam' },
  { href: '/ideas/clean', label: 'Clean' },
  { href: '/ideas/dither', label: 'Dither' },
  { href: '/ideas/play', label: 'Play (home)' },
];

/** Floating bar to flip between the home page ideas. Not part of any design. */
export function IdeaSwitcher() {
  const path = usePathname();
  return (
    <nav className="idea-switcher" aria-label="Home page ideas">
      {ideas.map((idea) => (
        <Link
          key={idea.href}
          href={idea.href}
          aria-current={path === idea.href ? 'page' : undefined}
        >
          {idea.label}
        </Link>
      ))}
    </nav>
  );
}
