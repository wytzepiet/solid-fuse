'use client';

import { useEffect, useRef, useState } from 'react';

type Trip = { id: number; value: number };

/** How long one round trip is drawn out, in ms (see the keyframes in loop.css). */
const TRIP = 1700;

/**
 * The reactive loop, slowed down: a tap on the phone sends an event to JS,
 * the handler sets the signal, one op crosses back, one widget rebuilds.
 */
export function LoopMachine({ codeHtml }: { codeHtml: string }) {
  const [shown, setShown] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const target = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const tap = () => {
    const value = ++target.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    setTrips((t) => [...t, { id: value, value }]);
    timers.current.push(
      setTimeout(() => {
        setShown(value);
        setTrips((t) => t.filter((trip) => trip.id !== value));
      }, TRIP),
    );
  };

  // One tap on load, so the loop is seen once without being asked for.
  useEffect(() => {
    const first = setTimeout(() => {
      if (target.current === 0) tap();
    }, 1100);
    return () => {
      clearTimeout(first);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lp-machine">
      <div className="lp-side lp-js">
        <p className="lp-side-label">Your TSX, on the QuickJS thread</p>
        <div className="lp-code">
          {trips.map((trip) => (
            <span key={trip.id} aria-hidden>
              <i className="lp-hl lp-hl-handler" />
              <i className="lp-hl lp-hl-read" />
            </span>
          ))}
          <div dangerouslySetInnerHTML={{ __html: codeHtml }} />
        </div>
      </div>

      <div className="lp-wire" aria-hidden>
        <div className="lp-track lp-track-ops">
          <span className="lp-track-name">ops to Dart</span>
          {trips.map((trip) => (
            <span key={trip.id} className="lp-pkt lp-pkt-ops">
              [3, 6, "{trip.value}"]
            </span>
          ))}
        </div>
        <div className="lp-batch">
          {shown === 0 ? (
            <span className="lp-batch-empty">Tap the button in the phone</span>
          ) : (
            <>
              <code key={shown}>[3, 6, "{shown}"]</code>
              <span>
                The whole batch: set text, node 6. Nothing else crossed.
              </span>
            </>
          )}
        </div>
        <div className="lp-track lp-track-events">
          <span className="lp-track-name">events to JS</span>
          {trips.map((trip) => (
            <span key={trip.id} className="lp-pkt lp-pkt-event">
              press, node 7
            </span>
          ))}
        </div>
      </div>

      <div className="lp-side lp-dart">
        <p className="lp-side-label">Flutter widgets, on the UI thread</p>
        <div className="lp-phone">
          <div className="lp-screen">
            <span
              key={shown}
              className={shown > 0 ? 'lp-count lp-rebuilt' : 'lp-count'}
              aria-live="polite"
            >
              {shown}
            </span>
            <button type="button" className="lp-tap" onClick={tap}>
              Tap me
            </button>
          </div>
        </div>
        <p className="lp-tally">
          Rebuilds: Text <b>{shown}</b>, View <b>0</b>, Pressable <b>0</b>
        </p>
      </div>
    </div>
  );
}
