'use client';

import { useEffect, useRef } from 'react';

export type DitherScene = 'flow' | 'spring' | 'async' | 'chart' | 'platforms' | 'rise';
const scenes: DitherScene[] = ['flow', 'spring', 'async', 'chart', 'platforms', 'rise'];

const frag = `
precision highp float;
uniform vec2 r;      // canvas size in device pixels
uniform float t;     // seconds
uniform float cell;  // finest cell size in device pixels
uniform vec2 m;      // pointer, 0..1, y up; negative when away
uniform int scene;
uniform int light;  // 1 on a light page: no cream marks
uniform sampler2D ta;  // the two platform marks, for the platforms scene
uniform sampler2D tb;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

// Brightness of the picture at a point, before it is broken into marks.
float field(vec2 uv) {
  float asp = r.x / r.y;
  vec2 p = vec2(uv.x * asp, uv.y);

  if (scene == 0) {
    float n = fbm(p * 1.2 + vec2(t * 0.05, -t * 0.03));
    float w = sin(p.x * 1.25 - p.y * 1.1 + n * 4.5 + t * 0.22) * 0.5 + 0.5;
    float w2 = sin(p.x * 2.6 + p.y * 1.7 - n * 3.0 - t * 0.15) * 0.5 + 0.5;
    float v = (pow(w, 1.4) * 0.8 + pow(w2, 2.0) * 0.4) * (0.5 + 0.55 * uv.x);
    v *= 0.6 + 0.55 * uv.y;
    if (m.x >= 0.0) v += 0.55 * exp(-length((uv - m) * vec2(asp, 1.0)) * 5.0);
    return v;
  }
  if (scene == 1) {
    // A spring: overshoots, settles, is pushed again.
    float k = mod(t, 2.6);
    float s = 1.0 - exp(-k * 3.2) * cos(k * 11.0);
    float push = step(1.3, k);
    float k2 = max(k - 1.3, 0.0);
    float s2 = 1.0 - exp(-k2 * 3.2) * cos(k2 * 11.0);
    float radius = 0.2 + 0.1 * (push > 0.5 ? 1.0 - s2 : s);
    float d = length(p - vec2(asp * 0.5, 0.5));
    return smoothstep(radius + 0.16, radius - 0.05, d) * (0.75 + 0.35 * (1.0 - d / radius));
  }
  if (scene == 2) {
    // Rows arriving: a sweep of light, then they stay.
    float row = floor(uv.y * 5.0);
    float inRow = step(0.22, fract(uv.y * 5.0)) * step(fract(uv.y * 5.0), 0.82);
    float k = mod(t * 0.5 + 0.0, 2.2);
    float arrived = smoothstep(0.0, 0.25, k - (4.0 - row) * 0.22);
    float sweep = exp(-pow((uv.x - fract(t * 0.55)) * 5.0, 2.0)) * (1.0 - arrived);
    float len = 0.55 + 0.3 * hash(vec2(row, 3.0));
    float bar = inRow * step(0.08, uv.x) * step(uv.x, 0.08 + mix(0.84, len, 0.0));
    return bar * (0.2 + 0.35 * sweep + 0.6 * arrived * step(uv.x, 0.08 + len));
  }
  if (scene == 3) {
    float x = uv.x * 5.5 + t * 0.25;
    float y = 0.42 + 0.16 * sin(x) + 0.1 * sin(x * 2.3 + 1.0) + uv.x * 0.2;
    float under = smoothstep(y + 0.02, y - 0.02, uv.y);
    float line = exp(-abs(uv.y - y) * 26.0);
    return under * (0.16 + 0.5 * uv.y / y) + line;
  }
  if (scene == 4) {
    // One platform's mark turning into the other's, a cell at a time.
    vec2 q = (p - vec2(asp * 0.5, 0.5)) / 0.8 + 0.5;
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return 0.0;
    float k = smoothstep(0.3, 0.7, sin(t * 0.7) * 0.5 + 0.5);
    float pick = step(hash(floor(uv * r / cell) * 1.31 + 7.0), k);
    return mix(texture2D(ta, q).r, texture2D(tb, q).r, pick) * mix(0.62, 1.0, uv.y + 0.1);
  }
  // rise
  float n = fbm(p * 1.6 + vec2(0.0, -t * 0.06));
  float d = length((uv - vec2(0.5, -0.25)) * vec2(asp * 0.7, 1.0));
  return smoothstep(1.15, 0.2, d + n * 0.25);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  // In the hero the marks are coarse on the left and fine on the right:
  // signals in, pixels out.
  float size = cell;
  if (scene == 0) size = cell * pow(2.0, floor((1.0 - px.x / r.x) * 3.0));

  vec2 id = floor(px / size);
  vec2 q = fract(px / size) - 0.5;
  float v = field((id + 0.5) * size / r);
  v = clamp(v + (bayer4(id) - 0.5) * 0.2, 0.0, 1.0);
  float level = floor(v * 5.999);

  float aa = 1.2 / size;
  float box = max(abs(q.x), abs(q.y));
  float ink = 0.0;
  if (level == 1.0) ink = smoothstep(0.13 + aa, 0.13 - aa, length(q));
  else if (level == 2.0) {
    float cross = min(max(abs(q.x) - 0.06, abs(q.y) - 0.28), max(abs(q.y) - 0.06, abs(q.x) - 0.28));
    ink = smoothstep(aa, -aa, cross);
  }
  else if (level == 3.0) ink = smoothstep(aa, -aa, abs(box - 0.27) - 0.055);
  else if (level == 4.0) ink = smoothstep(0.33 + aa, 0.33 - aa, box);
  else if (level == 5.0) ink = smoothstep(0.455 + aa, 0.455 - aa, box);

  vec3 cold = vec3(0.21, 0.33, 1.0);
  vec3 warm = vec3(1.0, 0.47, 0.12);
  vec3 hot = light == 1 ? vec3(0.62, 0.2, 0.02) : vec3(1.0, 0.9, 0.74);
  vec3 col = level <= 2.0 ? cold * (0.55 + 0.25 * level) : level <= 4.0 ? warm : hot;
  // Premultiplied: the marks sit on nothing, so the page shows through.
  gl_FragColor = vec4(col * ink, ink);
}`;

/** A white-on-black, slightly soft drawing for the shader to sample. */
function mark(draw: (ctx: CanvasRenderingContext2D) => void) {
  const shape = document.createElement('canvas');
  shape.width = shape.height = 256;
  const ctx = shape.getContext('2d')!;
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  draw(ctx);
  const out = document.createElement('canvas');
  out.width = out.height = 256;
  const o = out.getContext('2d')!;
  o.fillStyle = '#000';
  o.fillRect(0, 0, 256, 256);
  o.filter = 'blur(2.5px)';
  o.drawImage(shape, 0, 0);
  return out;
}

const cut = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
};

/** An apple with a bite and a leaf. */
const apple = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(128, 96);
  ctx.bezierCurveTo(100, 72, 48, 84, 48, 144);
  ctx.bezierCurveTo(48, 192, 84, 236, 108, 236);
  ctx.bezierCurveTo(118, 236, 122, 229, 128, 229);
  ctx.bezierCurveTo(134, 229, 138, 236, 148, 236);
  ctx.bezierCurveTo(172, 236, 208, 192, 208, 144);
  ctx.bezierCurveTo(208, 84, 156, 72, 128, 96);
  ctx.fill();
  cut(ctx, 218, 132, 36);
  ctx.beginPath();
  ctx.ellipse(148, 54, 27, 11, -0.95, 0, Math.PI * 2);
  ctx.fill();
};

/** A robot's head: a dome, two antennae, two eyes. */
const robot = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.arc(128, 196, 98, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(128 + side * 50, 116);
    ctx.lineTo(128 + side * 74, 72);
    ctx.stroke();
    cut(ctx, 128 + side * 42, 152, 11);
  }
};

const vert = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

/**
 * A moving picture drawn as a grid of small marks: nothing, a dot, a plus, a
 * ring, a square, a block, by brightness. Pauses off screen; one still frame
 * under reduced motion.
 */
export function DitherCanvas({
  scene,
  cell = 7,
  className = '',
}: {
  scene: DitherScene;
  cell?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { antialias: false });
    if (!canvas || !gl) return;

    const program = gl.createProgram()!;
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vert],
      [gl.FRAGMENT_SHADER, frag],
    ] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const [uR, uT, uCell, uM, uScene, uLight] = ['r', 't', 'cell', 'm', 'scene', 'light'].map(uniform);
    gl.uniform1i(uScene, scenes.indexOf(scene));

    if (scene === 'platforms') {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      [apple, robot].forEach((draw, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mark(draw));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(uniform(unit ? 'tb' : 'ta'), unit);
      });
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -1, y: -1 };
    let frame = 0;
    let visible = true;

    const root = document.documentElement;
    const draw = (now: number) => {
      frame = 0;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * scale);
      const h = Math.round(canvas.clientHeight * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uR, w, h);
      gl.uniform1f(uT, still ? 4.2 : now / 1000);
      gl.uniform1f(uCell, Math.round(cell * scale));
      gl.uniform2f(uM, pointer.x, pointer.y);
      gl.uniform1i(uLight, root.classList.contains('dark') ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && visible) frame = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - box.left) / box.width;
      pointer.y = 1 - (event.clientY - box.top) / box.height;
    };
    const leave = () => {
      pointer.x = pointer.y = -1;
    };

    const themed = new MutationObserver(kick);
    themed.observe(root, { attributeFilter: ['class'] });

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    seen.observe(canvas);
    window.addEventListener('resize', kick);
    const host = canvas.parentElement!;
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    kick();

    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      themed.disconnect();
      window.removeEventListener('resize', kick);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, [scene, cell]);

  return <canvas ref={ref} className={`dt-canvas ${className}`} aria-hidden />;
}
