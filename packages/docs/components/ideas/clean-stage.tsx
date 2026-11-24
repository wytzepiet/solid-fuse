'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { github } from './content';

export type Chapter = {
  name: string;
  title: string;
  note?: string;
  /** Highlighted code blocks, or a list of points for a chapter with no code. */
  code?: string[];
  points?: [string, string][];
  /** Which demo the phone shows: counter, spring, loading, chart, platforms. */
  demo: number;
};
export type StageCopy = {
  what: { title: string; body: string };
  layers: { title: string; body: string };
  update: { title: string; body: string };
  agent: { title: string; body: string };
};

const rows = ['Write the screen in TSX', 'Run it on the phone', 'Tap through it', 'Ship'];
const trips = [
  ['Lisbon', '3 nights'],
  ['Oslo', '5 nights'],
  ['Kyoto', '8 nights'],
  ['Lima', '2 nights'],
];

const seg = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const ease = (t: number) => t * t * (3 - 2 * t);

/** Where the chapters sit in the scroll, as a share of the track. */
const FIRST = 0.36;
const EACH = 0.075;

/**
 * One phone, pinned while the page scrolls. It comes apart into the widgets
 * its JSX made, then runs one snippet per chapter, then its frame becomes a
 * Linux window an agent is driving. Scroll position is the only clock:
 * continuous values go to CSS variables, discrete ones to state.
 */
export function CleanStage({ chapters, copy }: { chapters: Chapter[]; copy: StageCopy }) {
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [intro, setIntro] = useState(true);
  const [chapter, setChapter] = useState(-1);

  // What the demos on the phone are doing.
  const [pressed, setPressed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [on, setOn] = useState(true);
  const [taps, setTaps] = useState(0);
  const demo = chapter >= 0 ? chapters[chapter].demo : -1;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, -box.top / (box.height - vh)));
      const set = (name: string, value: number) => el.style.setProperty(name, value.toFixed(4));
      const end = FIRST + EACH * chapters.length;

      set('--rise', ease(seg(p, 0, 0.07)));
      set('--e', ease(seg(p, 0.07, 0.17)) * (1 - ease(seg(p, 0.27, 0.33))));
      set('--k', ease(seg(p, 0.33, 0.38)) * (1 - ease(seg(p, end, end + 0.04))));
      set('--m', ease(seg(p, end + 0.04, end + 0.12)));
      set('--c0', 1 - seg(p, 0, 0.045));
      set('--c1', seg(p, 0.09, 0.13) * (1 - seg(p, 0.185, 0.205)));
      set('--c2', seg(p, 0.205, 0.225) * (1 - seg(p, 0.29, 0.32)));
      set('--c3', seg(p, end + 0.06, end + 0.1));
      // Fit the phone to short and narrow screens.
      set('--fit', Math.max(0.5, Math.min(1, (vh * 0.6) / 610, window.innerWidth / 420)));

      setStep(p > 0.985 ? 4 : p > 0.965 ? 3 : p > 0.945 ? 2 : p > 0.215 ? 1 : 0);
      setPulse(p > 0.215 && p < 0.3);
      setIntro(p < 0.03);
      setChapter(
        p >= 0.345 && p < end + 0.02
          ? Math.max(0, Math.min(chapters.length - 1, Math.floor((p - FIRST) / EACH)))
          : -1,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [chapters.length]);

  // Each demo plays once when its chapter comes up.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (demo === 1) {
      timers.push(setTimeout(() => setPressed(true), 500), setTimeout(() => setPressed(false), 950));
    } else if (demo === 2) {
      setLoaded(false);
      timers.push(setTimeout(() => setLoaded(true), 1200));
    } else if (demo === 4) {
      setPlatform('ios');
      timers.push(setTimeout(() => setPlatform('android'), 1300));
    }
    return () => timers.forEach(clearTimeout);
  }, [demo]);

  const done = [true, true, step >= 1, step >= 3];
  const count = done.filter(Boolean).length;
  const page = (i: number) => (chapter === i ? ' is-shown' : '');
  const shown = (d: number) => (demo === d ? ' is-shown' : '');

  return (
    <div
      ref={track}
      className={`cx-track${pulse ? ' is-pulse' : ''}`}
      style={{ height: `${(chapters.length * 0.8 + 6) * 100}vh` }}
    >
      <div className="cx-stage">
        <div className={`cx-cap cx-cap-0${intro ? '' : ' is-off'}`}>
          <h1>{copy.what.title}</h1>
          <p>{copy.what.body}</p>
          <div className="cx-actions">
            <Link href="/docs/start/quick-start" className="cx-btn">
              Get started
            </Link>
            <a href={github} className="cx-link">
              View source
            </a>
          </div>
        </div>
        <div className="cx-cap cx-cap-1">
          <h2>{copy.layers.title}</h2>
          <p>{copy.layers.body}</p>
        </div>
        <div className="cx-cap cx-cap-2">
          <h2>{copy.update.title}</h2>
          <p>{copy.update.body}</p>
        </div>
        <div className="cx-cap cx-cap-3">
          <h2>{copy.agent.title}</h2>
          <p>{copy.agent.body}</p>
        </div>

        <div className="cx-book" aria-hidden={chapter < 0}>
          <ol className="cx-toc">
            {chapters.map((c, i) => (
              <li key={c.name} className={chapter === i ? 'is-here' : ''}>
                {c.name}
              </li>
            ))}
          </ol>
          <div className="cx-pages">
            {chapters.map((c, i) => (
              <article key={c.name} className={`cx-page${page(i)}`}>
                <h2>{c.title}</h2>
                {c.code?.map((html, j) => (
                  <div key={j} className="cx-code" dangerouslySetInnerHTML={{ __html: html }} />
                ))}
                {c.points && (
                  <dl className="cx-points">
                    {c.points.map(([term, text]) => (
                      <div key={term}>
                        <dt>{term}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {c.note && <p>{c.note}</p>}
              </article>
            ))}
          </div>
        </div>

        <div className="cx-glow" />

        <div className="cx-device">
          <div className="cx-body">
            <span className="cx-titlebar">my_app on Linux, headless</span>
          </div>

          <div className="cx-plate cx-plate-view">
            <span className="cx-island" />
            <code className="cx-tag">{'<View>'}</code>
          </div>

          <div className="cx-plate cx-plate-text">
            <p className="cx-today">Today</p>
            <p className="cx-count">
              <b key={count}>{count}</b> of {rows.length}
            </p>
            <div className="cx-bar">
              <i style={{ width: `${(count / rows.length) * 100}%` }} />
            </div>
            <code className="cx-tag">{'<Text>{done()} of {total}</Text>'}</code>
          </div>

          <div className="cx-plate cx-plate-list">
            <ul>
              {rows.map((row, i) => (
                <li
                  key={row}
                  className={`${done[i] ? 'is-done' : ''}${i === 2 ? ' cx-live' : ''}${
                    i === 3 && step === 2 ? ' is-tapping' : ''
                  }`}
                >
                  <span className="cx-check" />
                  {row}
                </li>
              ))}
            </ul>
            <code className="cx-tag">{'<For each={items()}>'}</code>
          </div>

          {/* What each chapter's snippet looks like when it runs. */}
          <div className="cx-plate cx-demos">
            <span className="cx-island" />

            <div className={`cx-demo cx-demo-counter${shown(0)}`}>
              <b key={taps}>{taps}</b>
              <button type="button" tabIndex={demo === 0 ? 0 : -1} onClick={() => setTaps(taps + 1)}>
                Tap me
              </button>
            </div>

            <div className={`cx-demo cx-demo-spring${shown(1)}`}>
              <button
                type="button"
                className={pressed ? 'is-pressed' : ''}
                aria-label="Press to spring"
                tabIndex={demo === 1 ? 0 : -1}
                onPointerDown={() => setPressed(true)}
                onPointerUp={() => setPressed(false)}
                onPointerLeave={() => setPressed(false)}
              />
              <span>Press and hold</span>
            </div>

            <div className={`cx-demo cx-demo-async${shown(2)}${loaded ? ' is-loaded' : ''}`}>
              <p className="cx-demo-title">Trips</p>
              <ul>
                {trips.map(([city, nights], i) => (
                  <li key={city} style={{ transitionDelay: `${i * 70}ms` }}>
                    <b>{city}</b>
                    <span>{nights}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`cx-demo cx-demo-chart${shown(3)}`}>
              <p className="cx-today">This week</p>
              <p className="cx-count">42.6 km</p>
              <svg viewBox="0 0 240 150" aria-hidden>
                <defs>
                  <linearGradient id="cx-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff8a2a" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="cx-area"
                  d="M0 118 C30 104 42 62 72 74 S112 126 140 88 S184 20 204 36 S230 58 240 30 V150 H0 Z"
                  fill="url(#cx-fill)"
                />
                <path
                  key={demo === 3 ? 'draw' : 'idle'}
                  className="cx-line"
                  pathLength={1}
                  d="M0 118 C30 104 42 62 72 74 S112 126 140 88 S184 20 204 36 S230 58 240 30"
                />
              </svg>
              <div className="cx-days">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            </div>

            <div className={`cx-demo cx-demo-platform is-${platform}${shown(4)}`}>
              <p className="cx-demo-title">Settings</p>
              <div className="cx-setting">
                Notifications
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label="Notifications"
                  tabIndex={demo === 4 ? 0 : -1}
                  onClick={() => setOn(!on)}
                />
              </div>
              <span className="cx-save">Save</span>
              <div className="cx-flip" role="group" aria-label="Platform">
                {(['ios', 'android'] as const).map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={platform === name}
                    tabIndex={demo === 4 ? 0 : -1}
                    onClick={() => setPlatform(name)}
                  >
                    {name === 'ios' ? 'iOS' : 'Android'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <pre className="cx-term" aria-hidden={step < 2}>
          <span>
            <i>$ </i>fuse dev --headless
          </span>
          <span className="cx-term-out">Ready for fuse drive</span>
          <span className={step >= 2 ? '' : 'is-hidden'}>
            <i>$ </i>fuse drive tap --text "Ship"
          </span>
          <span className={step >= 4 ? '' : 'is-hidden'}>
            <i>$ </i>fuse drive take-screenshots -o screen.png
          </span>
          <span className={step >= 4 ? 'cx-term-out' : 'cx-term-out is-hidden'}>
            screen.png, 4 of 4 done
          </span>
        </pre>
      </div>
    </div>
  );
}
