import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { DitherCanvas } from '@/components/ideas/dither-canvas';
import { PitchSections } from '@/components/ideas/pitch-sections';
import { github } from '@/components/ideas/content';
import { what } from '@/components/ideas/tour';
import './dither.css';

const sans = Geist({ subsets: ['latin'], variable: '--dt-font' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--dt-mono' });

export default function DitherIdea() {
  return (
    <div className={`dt ${sans.variable} ${mono.variable}`}>
      {/* 1. What is it */}
      <section className="dt-hero">
        <DitherCanvas scene="flow" cell={7} />
        <header className="dt-nav">
          <Link href="/ideas/dither" className="dt-logo">
            solid-fuse
          </Link>
          <nav>
            <Link href="/docs">Docs</Link>
            <Link href="/docs/architecture">Architecture</Link>
            <a href={github}>GitHub</a>
          </nav>
        </header>

        <div className="dt-hero-text">
          <h1>{what.title}</h1>
          <div>
            <p>{what.body}</p>
            <div className="dt-actions">
              <Link href="/docs/getting-started" className="dt-btn">
                Get started
              </Link>
              <a href={github} className="dt-link">
                View source
              </a>
            </div>
          </div>
        </div>
      </section>

      <PitchSections />

      <section className="dt-end">
        <DitherCanvas scene="rise" cell={8} />
        <h2>Start with the guide.</h2>
        <div className="dt-actions">
          <Link href="/docs/getting-started" className="dt-btn">
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
        </span>
      </footer>
    </div>
  );
}
