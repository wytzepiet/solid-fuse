import Link from 'next/link';
import { Bricolage_Grotesque } from 'next/font/google';
import { LoopMachine } from '@/components/ideas/loop-machine';
import { counterCode, dartCode, github, pillars, solidCode } from '@/components/ideas/content';
import { PillarArt } from '@/components/ideas/pillar-art';
import { highlight } from '@/lib/highlight';
import './loop.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--lp-font' });

export default async function LoopIdea() {
  const [counterHtml, solidHtml, dartHtml] = await Promise.all([
    highlight(counterCode, 'tsx'),
    highlight(solidCode, 'tsx'),
    highlight(dartCode, 'dart'),
  ]);

  return (
    <div className={`lp ${display.variable}`}>
      <header className="lp-nav">
        <Link href="/ideas/loop" className="lp-logo">
          solid-fuse
        </Link>
        <nav>
          <Link href="/docs">Docs</Link>
          <Link href="/docs/internals/architecture">Architecture</Link>
          <a href={github}>GitHub</a>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-head">
          <h1>
            A signal changes.
            <br />
            One widget rebuilds.
          </h1>
          <div className="lp-hero-side">
            <p>
              Mobile apps in Solid 2.0, drawn by Flutter. Easy for you or your
              agent to write, fast without tuning. Try it: the phone below is
              the app on the left.
            </p>
            <div className="lp-actions">
              <Link href="/docs/start/quick-start" className="lp-btn lp-btn-main">
                Get started
              </Link>
              <a href={github} className="lp-btn">
                View source
              </a>
            </div>
          </div>
        </div>

        <LoopMachine codeHtml={counterHtml} />
        <p className="lp-note">
          Slowed down so you can follow it. The real round trip fits well
          inside one frame.
        </p>
      </section>

      <section className="lp-pillars">
        <h2>
          Easy to write, for you or your agent.
          <br />
          Fast without tuning.
        </h2>
        {pillars.map((pillar) => (
          <article key={pillar.key}>
            <h3>{pillar.name}</h3>
            <div className="lp-pillar-text">
              {pillar.body.map((text) => (
                <p key={text}>{text}</p>
              ))}
              <Link href={pillar.href} className="lp-more">
                {pillar.link}
              </Link>
            </div>
            <PillarArt pillar={pillar.key} />
          </article>
        ))}
      </section>

      <section className="lp-steps">
        <h2>What the phone above just did, in order</h2>

        <ol>
          <li>
            <div className="lp-step-head">
              <span className="lp-num">1</span>
              <h3>You write Solid</h3>
            </div>
            <div className="lp-step-body">
              <p>
                Signals, memos, effects, <code>Show</code>, <code>For</code>:
                Solid 2.0 as it is, rendering through a custom renderer instead
                of the DOM. There is no virtual DOM and nothing to diff.
              </p>
              <div
                className="lp-slab"
                dangerouslySetInnerHTML={{ __html: solidHtml }}
              />
            </div>
          </li>
          <li>
            <div className="lp-step-head">
              <span className="lp-num">2</span>
              <h3>Solid journals what changed</h3>
            </div>
            <div className="lp-step-body">
              <p>
                A signal update becomes a short list of operations: create a
                node, set a prop, insert a child. Ten prop changes are one
                batch, not ten calls.
              </p>
              <p>
                The part of your JSX that never changes is lifted into a
                template at compile time and sent once. After that, each use is
                a single op and Dart builds the nodes itself.
              </p>
              <pre className="lp-slab lp-raw">
                <code>
                  <span className="lp-dim">{'// one flush, as it crosses'}</span>
                  {'\n[2, 7, "opacity", 0.4,  2, 7, "padding", 12,  3, 6, "4"]'}
                </code>
              </pre>
            </div>
          </li>
          <li>
            <div className="lp-step-head">
              <span className="lp-num">3</span>
              <h3>One call crosses to Dart</h3>
            </div>
            <div className="lp-step-body">
              <p>
                JavaScript runs in QuickJS on a thread of its own, embedded
                through Rust. State, data fetching and timers stay there. Only
                what needs Flutter crosses: render ops one way, gesture events
                the other. Dart never waits for JS, apart from list builders
                that need a row during the frame.
              </p>
            </div>
          </li>
          <li>
            <div className="lp-step-head">
              <span className="lp-num">4</span>
              <h3>Flutter rebuilds that node</h3>
            </div>
            <div className="lp-step-body">
              <p>
                Each node on the Dart side is a <code>ChangeNotifier</code>.
                Flutter’s own <code>ListenableBuilder</code> picks up the
                change and rebuilds the widget for that node, with no custom
                reconciler in between. From there it is ordinary Flutter:
                layout, gestures, navigation, Impeller.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="lp-start">
        <div>
          <h2>The Dart side is one short file</h2>
          <p>
            Create the runtime, register the packages <code>fuse link</code>{' '}
            found in <code>node_modules</code>, start it. The app root is in
            your TSX. <code>fuse dev</code> runs Vite and Flutter together,
            with hot reload on the device.
          </p>
          <Link href="/docs/start/quick-start" className="lp-btn lp-btn-main">
            Read the getting started guide
          </Link>
        </div>
        <div className="lp-slab" dangerouslySetInnerHTML={{ __html: dartHtml }} />
      </section>

      <footer className="lp-foot">
        <span>solid-fuse, early preview</span>
        <span>
          <Link href="/docs">Docs</Link>
          <a href={github}>GitHub</a>
        </span>
      </footer>
    </div>
  );
}
