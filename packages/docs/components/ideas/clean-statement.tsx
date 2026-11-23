'use client';

import { useEffect, useRef } from 'react';

/** A paragraph whose words light up as it scrolls through the viewport. */
export function CleanStatement({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const words = Array.from(el.children) as HTMLElement[];
    let frame = 0;

    const paint = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the paragraph's top reaches 85% of the viewport, 1 when its bottom reaches 55%.
      const progress = (vh * 0.85 - box.top) / (box.height + vh * 0.3);
      const lit = Math.max(0, Math.min(1, progress)) * words.length;
      words.forEach((word, i) => {
        word.style.opacity = String(Math.max(0.28, Math.min(1, lit - i + 1)));
      });
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
  }, []);

  return (
    <p ref={ref} className="cl-statement">
      {text.split(' ').map((word, i) => (
        <span key={i}>{word} </span>
      ))}
    </p>
  );
}
