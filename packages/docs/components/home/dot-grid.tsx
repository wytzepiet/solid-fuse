'use client';

import { useEffect, useRef } from 'react';

export function DotGrid({
  color = 'rgba(212, 147, 89, 0.18)',
  spacing = 14,
  glow,
  className = '',
}: {
  color?: string;
  spacing?: number;
  /** Radial glow that makes dots bigger and brighter near the center. */
  glow?: { x: number; y: number; radius: number; intensity: number };
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let prevW = 0, prevH = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;

      if (w === prevW && h === prevH) return;
      prevW = w;
      prevH = h;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // Parse base color once
      const tmp = document.createElement('canvas').getContext('2d')!;
      tmp.fillStyle = color;
      tmp.fillRect(0, 0, 1, 1);
      const [br, bg, bb, ba] = tmp.getImageData(0, 0, 1, 1).data;
      const baseAlpha = ba / 255;
      const baseRadius = 0.7;

      const glowCx = glow ? glow.x * w : 0;
      const glowCy = glow ? glow.y * h : 0;
      const glowR = glow ? glow.radius * Math.max(w, h) : 0;

      for (let y = spacing / 2; y < h; y += spacing) {
        for (let x = spacing / 2; x < w; x += spacing) {
          let alpha = baseAlpha;
          let dotR = baseRadius;

          if (glow) {
            const dx = x - glowCx;
            const dy = y - glowCy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const norm = dist / glowR;
            if (norm < 1) {
              const t = 1 - norm;
              // Sine-wave variation for organic swirl pattern
              const wave = Math.sin(norm * 12 + Math.atan2(dy, dx) * 3) * 0.45 + 0.55;
              const boost = t * t * glow.intensity * wave;
              alpha += boost;
              dotR += t * glow.intensity * 2.5;
            }
          }

          ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    draw();
    const observer = new ResizeObserver(() => requestAnimationFrame(draw));
    observer.observe(parent);
    return () => observer.disconnect();
  }, [color, spacing, glow]);

  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
}
