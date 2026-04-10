'use client';

import { useEffect, useRef } from 'react';

export function HeroSphere({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 960;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = 480, cy = 480, r = 420;

    for (let row = 0; row < 52; row++) {
      for (let col = 0; col < 52; col++) {
        const x = cx - r + (col / 51) * r * 2;
        const y = cy - r + (row / 51) * r * 2;
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;

        const norm = dist / r;
        const dotSize = Math.max(0.6, (1 - norm) * 2);
        let opacity = Math.max(0.08, (1 - norm * norm) * 0.95);
        opacity *= Math.sin(norm * 9 + Math.atan2(dy, dx) * 2.5) * 0.2 + 0.8;
        if (opacity < 0.04) continue;

        ctx.fillStyle = `rgba(212, 147, 89, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: 960, height: 960 }}
    />
  );
}
