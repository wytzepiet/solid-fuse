import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { DitherCanvas } from '@/components/ideas/dither-canvas';
import { PitchSections } from '@/components/ideas/pitch-sections';
import { PlayHero } from '@/components/ideas/play-hero';
import { github } from '@/components/ideas/content';
import { what } from '@/components/ideas/tour';
import { FuseLogo } from '@/lib/layout.shared';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import '../dither/dither.css';
import './play.css';

const sans = Geist({ subsets: ['latin'], variable: '--dt-font' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--dt-mono' });

export default function PlayIdea() {
  return (
    <div className={`dt pl ${sans.variable} ${mono.variable}`}>
      <div className="pl-frame">
      <header className="dt-nav">
        <Link href="/" className="dt-logo">
          <FuseLogo />
        </Link>
        <nav>
          <Link href="/docs">Docs</Link>
          <Link href="/docs/internals/architecture">Architecture</Link>
          <a href={github}>GitHub</a>
        </nav>
      </header>

      <section className="pl-hero">
        <div className="dt-card">
        <div className="pl-head">
          <h1>{what.title}</h1>
          <div>
            <p>{what.body}</p>
            <div className="dt-actions">
              <Link href="/docs/start/quick-start" className="dt-btn">
                Get started
              </Link>
              <a href={github} className="dt-link">
                View source
              </a>
            </div>
          </div>
        </div>

        <PlayHero />
        </div>
      </section>

      <PitchSections showBasics={false} />

      <section className="dt-end">
        <DitherCanvas scene="rise" cell={8} />
        <h2>Start with the guide.</h2>
        <div className="dt-actions">
          <Link href="/docs/start/quick-start" className="dt-btn">
            Read the docs
          </Link>
          <a href={github} className="dt-link">
            GitHub
          </a>
        </div>
      </section>

      <footer className="dt-foot">
        <span>solid-fuse, early preview</span>
        <span>
          <Link href="/docs">Docs</Link>
          <a href={github}>GitHub</a>
          <ThemeSwitch mode="light-dark-system" className="dt-theme" />
        </span>
      </footer>
      </div>
    </div>
  );
}
