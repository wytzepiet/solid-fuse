import Link from 'next/link';
import { Archivo } from 'next/font/google';
import { appCode, dartCode, github, pillars } from '@/components/ideas/content';
import { PillarArt } from '@/components/ideas/pillar-art';
import { highlight } from '@/lib/highlight';
import './poster.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--ps-font' });

export default async function PosterIdea() {
  const [appHtml, dartHtml] = await Promise.all([
    highlight(appCode, 'tsx'),
    highlight(dartCode, 'dart'),
  ]);

  return (
    <div className={`ps ${archivo.variable}`}>
      <section className="ps-hero">
        <header className="ps-nav">
          <Link href="/ideas/poster" className="ps-logo">
            solid-fuse
          </Link>
          <nav>
            <Link href="/docs">Docs</Link>
            <a href={github}>GitHub</a>
          </nav>
        </header>

        <h1>
          Write Solid.
          <br />
          Ship Flutter.
        </h1>

        <div className="ps-hero-foot">
          <p>
            Mobile apps in Solid 2.0, drawn by Flutter. Easy for you or your
            agent to write, fast without tuning.
          </p>
          <div className="ps-actions">
            <Link href="/docs/getting-started" className="ps-btn ps-btn-main">
              Get started
            </Link>
            <a href={github} className="ps-btn">
              View source
            </a>
          </div>
        </div>
      </section>

      <section className="ps-pillars">
        {pillars.map((pillar) => (
          <article key={pillar.key}>
            <h2>{pillar.name}</h2>
            <div className="ps-pillar-body">
              <div className="ps-pillar-text">
                {pillar.body.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                <Link href={pillar.href}>{pillar.link}</Link>
              </div>
              <PillarArt pillar={pillar.key} />
            </div>
          </article>
        ))}
      </section>

      <section className="ps-app">
        <div className="ps-app-head">
          <h2>A whole app is two files.</h2>
          <p>
            One component in TSX and a Dart entry point that starts the
            runtime. <code>fuse dev</code> runs Vite and Flutter together and
            hot reloads on the device.
          </p>
        </div>
        <div className="ps-files">
          <figure>
            <figcaption>src/App.tsx</figcaption>
            <div dangerouslySetInnerHTML={{ __html: appHtml }} />
          </figure>
          <figure>
            <figcaption>dart/lib/main.dart</figcaption>
            <div dangerouslySetInnerHTML={{ __html: dartHtml }} />
          </figure>
        </div>
      </section>

      <section className="ps-cta">
        <Link href="/docs/getting-started">Start with the docs.</Link>
        <p>
          Early preview. The source is on <a href={github}>GitHub</a>.
        </p>
      </section>
    </div>
  );
}
