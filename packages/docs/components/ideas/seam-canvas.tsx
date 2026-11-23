'use client';

import { useEffect, useRef } from 'react';

const frag = `
precision highp float;
uniform vec2 r;
uniform float t;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = (gl_FragCoord.xy - 0.5 * r) / r.y;

  // The seam wanders, and settles on the centre line at the bottom edge so
  // the line drawn through the rest of the page picks it up.
  float settle = smoothstep(0.0, 0.45, uv.y);
  float wander = (fbm(vec2(p.y * 1.5 + 4.0, t * 0.07)) - 0.5) * 0.34
               + (fbm(vec2(p.y * 6.0, t * 0.22)) - 0.5) * 0.05;
  float d = p.x - wander * settle;
  float a = abs(d);

  vec3 ground = vec3(0.075, 0.035, 0.105);
  vec3 solid = vec3(0.17, 0.33, 1.0);
  vec3 flutter = vec3(0.05, 0.78, 0.72);

  // Two fields, each drifting toward the seam.
  float side = smoothstep(-0.015, 0.015, d);
  float flowL = fbm(vec2(p.x * 2.2 - t * 0.09, p.y * 2.6));
  float flowR = fbm(vec2(p.x * 2.2 + t * 0.09, p.y * 2.6 + 7.0));
  float flow = mix(flowL, flowR, side);
  vec3 field = mix(solid, flutter, side) * pow(flow, 2.2) * 0.85 * exp(-a * 1.7);

  // Heat where they meet.
  float heat = exp(-a * 11.0);
  float core = exp(-a * 150.0);
  float flicker = 0.75 + 0.25 * fbm(vec2(p.y * 9.0 - t * 0.6, 2.0));
  vec3 hot = mix(vec3(1.0, 0.2, 0.25), vec3(1.0, 0.72, 0.25), heat);

  // Everything but the seam itself fades into the page at the bottom edge.
  float fade = smoothstep(0.0, 0.22, uv.y);
  vec3 c = ground + (field + hot * heat * 0.55 * flicker) * fade
         + hot * heat * 0.3 * (1.0 - fade) + vec3(1.0, 0.95, 0.82) * core;
  gl_FragColor = vec4(c, 1.0);
}`;

const vert = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

/** Two fields meeting at a hot seam. Pauses off screen; one still frame under reduced motion. */
export function SeamCanvas() {
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
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(program, 'r');
    const uT = gl.getUniformLocation(program, 't');

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let visible = true;

    const draw = (now: number) => {
      frame = 0;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(canvas.clientWidth * scale);
      const h = Math.round(canvas.clientHeight * scale);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uR, w, h);
      gl.uniform1f(uT, still ? 12 : now / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && visible) frame = requestAnimationFrame(draw);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    seen.observe(canvas);
    window.addEventListener('resize', kick);
    kick();

    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      window.removeEventListener('resize', kick);
    };
  }, []);

  return <canvas ref={ref} className="sm-canvas" aria-hidden />;
}
