import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { CleanHandoff } from '@/components/ideas/clean-handoff';
import { CleanStage, type Chapter } from '@/components/ideas/clean-stage';
import { appCode, dartCode, github } from '@/components/ideas/content';
import { agent, basics, names, ready, tour, what, why } from '@/components/ideas/tour';
import { highlight } from '@/lib/highlight';
import './clean.css';

const sans = Geist({ subsets: ['latin'], variable: '--cx-font' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--cx-mono' });

const quiet = (code: string, lang: string) => highlight(code, lang);

export default async function CleanIdea() {
  const [chapters, appHtml, dartHtml] = await Promise.all([
    Promise.all(
      [basics, ...tour].map(
        async (c, i): Promise<Chapter> => ({
          name: c.name,
          title: c.title,
          note: c.note,
          code: await Promise.all(c.code.map(([code, lang]) => quiet(code, lang))),
          demo: i,
        }),
      ),
    ).then((list): Chapter[] => [
      list[0],
      // Why this and not React Native, asked while the first example is still on the phone.
      { name: why.name, title: why.title, points: why.points, demo: 0 },
      ...list.slice(1),
    ]),
    quiet(appCode, 'tsx'),
    quiet(dartCode, 'dart'),
  ]);

  return (
    <div className={`cx ${sans.variable} ${mono.variable}`}>
      <header className="cx-nav">
        <Link href="/ideas/clean" className="cx-logo">
          solid-fuse
        </Link>
        <nav>
          <Link href="/docs">Docs</Link>
          <Link href="/docs/architecture">Architecture</Link>
          <a href={github}>GitHub</a>
        </nav>
      </header>

      <CleanStage
        chapters={chapters}
        copy={{
          what,
          layers: { title: names[1].title, body: names[1].body },
          update: { title: names[0].title, body: names[0].body },
          agent,
        }}
      />

      <section className="cx-agent">
        <div>
          <h2>Hand it to your agent.</h2>
          <p>
            The docs are served as plain text for models, and the app can be
            driven from a shell. These few lines are all a coding agent needs
            to be told.
          </p>
          <p className="cx-agent-links">
            <a href="/llms.txt">llms.txt</a>
            <a href="/llms-full.txt">llms-full.txt</a>
            <Link href="/docs/building/agents">Developing with agents</Link>
          </p>
        </div>
        <div>
          <CleanHandoff />
          <pre className="cx-mcp">
            <i>$ </i>claude mcp add fuse -- bunx fuse drive mcp
          </pre>
        </div>
      </section>

      <section className="cx-app">
        <h2>
          {ready.title} <span>A whole app is two files.</span>
        </h2>
        <p className="cx-ready">{ready.body}</p>
        <div className="cx-files">
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

      <section className="cx-end">
        <h2>Start with the guide.</h2>
        <div className="cx-actions">
          <Link href="/docs/getting-started" className="cx-btn">
            Read the docs
          </Link>
          <a href={github} className="cx-link">
            GitHub
          </a>
        </div>
      </section>

      <footer className="cx-foot">
        <span>solid-fuse, early preview</span>
        <span>
          <Link href="/docs">Docs</Link>
          <a href={github}>GitHub</a>
        </span>
      </footer>
    </div>
  );
}
