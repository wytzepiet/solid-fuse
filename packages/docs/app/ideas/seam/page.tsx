import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { SeamCanvas } from '@/components/ideas/seam-canvas';
import { PillarArt } from '@/components/ideas/pillar-art';
import { appCode, github } from '@/components/ideas/content';
import { highlight } from '@/lib/highlight';
import './seam.css';

const sans = Geist({ subsets: ['latin'], variable: '--sm-font' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--sm-mono' });

type Row = {
  /** Which way it crosses: to Flutter, to Solid, or shared by both. */
  dir: 'right' | 'left' | 'both';
  solid: [string, string];
  crossing: string;
  flutter: [string, string];
};

const rows: Row[] = [
  {
    dir: 'right',
    solid: [
      'A signal changes',
      'Solid 2.0 knows exactly which expression read it. No virtual DOM, nothing to diff.',
    ],
    crossing: '[3, 6, "4"]',
    flutter: [
      'One widget rebuilds',
      'The node is a ChangeNotifier. Flutter rebuilds the widget for that node and leaves the rest alone.',
    ],
  },
  {
    dir: 'left',
    solid: [
      'Your handler runs',
      'On a thread of its own, in a runtime that has fetch, crypto, timers and streams built in.',
    ],
    crossing: 'press, node 7',
    flutter: [
      'A finger lands',
      'Gestures, text input, scrolling and navigation are Flutter’s own. Dart never waits for JavaScript.',
    ],
  },
  {
    dir: 'right',
    solid: [
      'A spring is a signal',
      'createSpring moves to its target instead of jumping. Read it in JSX like any other value.',
    ],
    crossing: 'every frame',
    flutter: [
      'Drawn in the frame it ticks in',
      'The tick runs inside Flutter’s frame callback, so 60 Hz, 120 Hz and a dropped frame all look right.',
    ],
  },
  {
    dir: 'left',
    solid: [
      'npm',
      'Your JavaScript packages, and a typed component for every Flutter widget you export.',
    ],
    crossing: 'fuse gen',
    flutter: [
      'pub.dev',
      'Charts, maps, video, pickers. Export the package from fuse.dart; the wrapper is generated from its Dart signatures.',
    ],
  },
  {
    dir: 'right',
    solid: [
      'Constant JSX becomes a template',
      'The compiler lifts out whatever can’t change. JavaScript only creates the nodes that are live.',
    ],
    crossing: 'sent once',
    flutter: [
      'Only the Dart you render',
      'A release build keeps the adapters your bundle uses and drops the rest of the library.',
    ],
  },
];

export default async function SeamIdea() {
  const appHtml = await highlight(appCode, 'tsx');

  return (
    <div className={`sm ${sans.variable} ${mono.variable}`}>
      <section className="sm-hero">
        <SeamCanvas />
        <header className="sm-nav">
          <Link href="/ideas/seam" className="sm-logo">
            solid-fuse
          </Link>
          <nav>
            <Link href="/docs">Docs</Link>
            <a href={github}>GitHub</a>
          </nav>
        </header>

        <h1>
          <span>Solid writes it.</span>
          <span>Flutter draws it.</span>
        </h1>

        <div className="sm-hero-foot">
          <p>
            Mobile apps in Solid 2.0, drawn by Flutter. Easy for you or your
            agent to write, fast without tuning.
          </p>
          <div className="sm-actions">
            <Link href="/docs/start/quick-start" className="sm-btn sm-btn-main">
              Get started
            </Link>
            <a href={github} className="sm-btn">
              View source
            </a>
          </div>
        </div>
      </section>

      <section className="sm-seam">
        <div className="sm-sides" aria-hidden>
          <span>In Solid</span>
          <span>In Flutter</span>
        </div>
        {rows.map((row) => (
          <div key={row.crossing} className={`sm-row sm-${row.dir}`}>
            <div className="sm-cell sm-solid">
              <h2>{row.solid[0]}</h2>
              <p>{row.solid[1]}</p>
            </div>
            <div className="sm-cross">
              <code>{row.crossing}</code>
            </div>
            <div className="sm-cell sm-flutter">
              <h2>{row.flutter[0]}</h2>
              <p>{row.flutter[1]}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="sm-agents">
        <div>
          <h2>Written by you, or by your agent</h2>
          <p>
            Every app can be driven from the command line: tap, type, scroll,
            take a screenshot, read the logs. Flutter runs on Linux as well as
            on phones, so a cloud agent with no screen can run your mobile
            app, use it, and look at what it built.
          </p>
          <Link href="/docs/agents">Developing with agents</Link>
        </div>
        <PillarArt pillar="agents" />
      </section>

      <section className="sm-start">
        <figure className="art">
          <div dangerouslySetInnerHTML={{ __html: appHtml }} />
        </figure>
        <div>
          <h2>This is a whole screen</h2>
          <p>
            A component in TSX, and a short Dart entry point you write
            once. <code>fuse dev</code> runs Vite and Flutter together and hot
            reloads on the device.
          </p>
          <Link href="/docs/start/quick-start" className="sm-btn sm-btn-main">
            Read the getting started guide
          </Link>
        </div>
      </section>

      <footer className="sm-foot">
        <span>solid-fuse, early preview</span>
        <span>
          <Link href="/docs">Docs</Link>
          <a href={github}>GitHub</a>
        </span>
      </footer>
    </div>
  );
}
