'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DitherCanvas } from './dither-canvas';

const swatches = ['#ff8a2a', '#3d6bff', '#22c08a', '#f4f4f1', '#ff4d6d'];
type Part = 'pressable' | 'view' | 'text' | null;

/** A number in the code you can drag sideways, or nudge with the arrow keys. */
function Knob({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ x: number; start: number } | null>(null);
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const text = step < 1 ? String(Number(value.toFixed(2))) : String(value);

  return (
    <span
      className="pl-knob"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, start: value };
      }}
      onPointerMove={(event) => {
        if (drag.current) onChange(snap(drag.current.start + ((event.clientX - drag.current.x) / 5) * step));
      }}
      onPointerUp={() => (drag.current = null)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onChange(snap(value + step));
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onChange(snap(value - step));
      }}
    >
      {text}
    </span>
  );
}

/**
 * The first example, live: drag the values in the code and the phone follows.
 * The spring is integrated for real, so `bounce` behaves as it does in the
 * framework. Hovering a JSX element outlines what it made, and the reverse.
 */
export function PlayHero() {
  const [pressedScale, setPressedScale] = useState(1.2);
  const [bounce, setBounce] = useState(0.3);
  const [width, setWidth] = useState(120);
  const [radius, setRadius] = useState(36);
  const [color, setColor] = useState(0);
  const [label, setLabel] = useState('Hold me');
  const [pressed, setPressed] = useState(false);
  const [hot, setHot] = useState<Part>(null);

  const card = useRef<HTMLButtonElement>(null);
  const spring = useRef({ x: 1, v: 0, frame: 0, last: 0 });
  const target = pressed ? pressedScale : 1;

  useEffect(() => {
    const s = spring.current;
    const el = card.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      s.x = target;
      s.v = 0;
      el.style.transform = `scale(${target})`;
      return;
    }
    const omega = (2 * Math.PI) / 0.5;
    const zeta = 1 - bounce;
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - s.last) / 1000 || 0.016);
      s.last = now;
      // A few small steps per frame keep a stiff spring stable.
      for (let i = 0; i < 4; i++) {
        s.v += (-omega * omega * (s.x - target) - 2 * zeta * omega * s.v) * (dt / 4);
        s.x += s.v * (dt / 4);
      }
      el.style.transform = `scale(${s.x.toFixed(4)})`;
      s.frame =
        Math.abs(s.x - target) < 0.0008 && Math.abs(s.v) < 0.002 ? 0 : requestAnimationFrame(tick);
    };
    cancelAnimationFrame(s.frame);
    s.last = performance.now();
    s.frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.frame);
  }, [target, bounce]);

  // Show the spring once, unasked.
  useEffect(() => {
    const down = setTimeout(() => setPressed(true), 900);
    const up = setTimeout(() => setPressed(false), 1400);
    return () => {
      clearTimeout(down);
      clearTimeout(up);
    };
  }, []);

  const line = (part: Part, children: ReactNode) => (
    <span
      className={`pl-line${hot === part ? ' is-hot' : ''}`}
      onPointerEnter={() => setHot(part)}
      onPointerLeave={() => setHot(null)}
    >
      {children}
    </span>
  );
  const k = (text: string) => <i className="pl-k">{text}</i>;
  const t = (text: string) => <b>{text}</b>;

  return (
    <div className="pl-play">
      <div className="pl-left">
      <pre className="pl-code" aria-label="A component you can adjust">
        {k('const')} [pressed, setPressed] = {t('createSignal')}({k('false')});{'\n'}
        {k('const')} [scale] = {t('createSpring')}({'\n'}
        {'  '}() =&gt; (pressed() ?{' '}
        <Knob value={pressedScale} min={0.6} max={1.8} step={0.05} label="Scale while pressed" onChange={setPressedScale} />{' '}
        : 1),{'\n'}
        {'  '}
        {'{ '}bounce:{' '}
        <Knob value={bounce} min={0} max={0.9} step={0.05} label="Bounce" onChange={setBounce} />
        {' }'},{'\n'});{'\n\n'}
        {line('pressable', <>&lt;{t('Pressable')} onPressedChange={'{'}setPressed{'}'}&gt;{'\n'}</>)}
        {line(
          'view',
          <>
            {'  '}&lt;{t('View')}
            {'\n'}
            {'    '}width={'{'}
            <Knob value={width} min={60} max={190} step={2} label="Width" onChange={setWidth} />
            {'}'}
            {'\n'}
            {'    '}decoration={'{{ '}color:{' '}
            <button
              type="button"
              className="pl-swatch"
              aria-label="Change colour"
              style={{ ['--c' as string]: swatches[color] }}
              onClick={() => setColor((color + 1) % swatches.length)}
            >
              "{swatches[color]}"
            </button>
            , borderRadius:{' '}
            <Knob value={radius} min={0} max={95} step={1} label="Corner radius" onChange={setRadius} />
            {' }}'}
            {'\n'}
            {'    '}transform={'{{ '}scale: scale(){' }}'}
            {'\n'}
            {'  '}&gt;{'\n'}
          </>,
        )}
        {line(
          'text',
          <>
            {'    '}&lt;{t('Text')}&gt;
            <input
              className="pl-input"
              value={label}
              aria-label="Label"
              maxLength={14}
              size={Math.max(label.length, 1)}
              onChange={(event) => setLabel(event.target.value)}
            />
            &lt;/{t('Text')}&gt;{'\n'}
          </>,
        )}
        {line('view', <>{'  '}&lt;/{t('View')}&gt;{'\n'}</>)}
        {line('pressable', <>&lt;/{t('Pressable')}&gt;</>)}
      </pre>
      <p className="pl-hint">
        Drag the orange values, edit the label, then press the shape on the phone.
      </p>
      </div>

      <div className="pl-stage">
        <DitherCanvas scene="rise" cell={6} />
        <div className="pl-phone">
          <div
            className={`pl-pressable${hot === 'pressable' ? ' is-hot' : ''}`}
            onPointerEnter={() => setHot('pressable')}
            onPointerLeave={() => setHot(null)}
          >
            <button
              ref={card}
              type="button"
              className={`pl-card${hot === 'view' ? ' is-hot' : ''}`}
              style={{ width, height: width, borderRadius: radius, background: swatches[color] }}
              onPointerEnter={() => setHot('view')}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              onKeyDown={(event) => event.key === ' ' && setPressed(true)}
              onKeyUp={() => setPressed(false)}
            >
              <span
                className={hot === 'text' ? 'is-hot' : ''}
                onPointerEnter={(event) => {
                  event.stopPropagation();
                  setHot('text');
                }}
              >
                {label}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
