'use client';

import { useEffect, useRef } from 'react';

const VS = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main() {
  vec2 uv = v_uv;
  float t = u_time * 0.18;

  float n1 = noise(uv * 2.8 + vec2(t * 0.6, t * 0.4));
  float n2 = noise(uv * 1.6 + vec2(-t * 0.3, t * 0.7));
  float n  = n1 * 0.6 + n2 * 0.4;

  /* Royal Blue → Ice Blue → White gradient */
  vec3 royal = vec3(0.0, 0.341, 0.851);   /* #0057D9 */
  vec3 ice   = vec3(0.918, 0.953, 1.0);   /* #EAF3FF */
  vec3 white = vec3(1.0, 1.0, 1.0);

  float blend = uv.y + n * 0.22 - t * 0.04;
  vec3 col = mix(ice, white, smoothstep(0.3, 0.85, blend));
  col = mix(col, royal * 0.25, smoothstep(0.75, 1.1, blend + n * 0.1));

  /* Subtle AI-accent sky-blue shimmer top-right */
  float shimmer = noise(uv * 5.0 + vec2(t, -t * 0.5)) * 0.04;
  col += vec3(0.0, 0.06, 0.12) * shimmer;

  gl_FragColor = vec4(col, 0.7);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    let start = Date.now();
    let raf: number;

    function resize() {
      canvas!.width  = canvas!.clientWidth  || window.innerWidth;
      canvas!.height = canvas!.clientHeight || window.innerHeight;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function render() {
      gl!.uniform1f(uTime, (Date.now() - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: -1, opacity: 0.65 }}
      aria-hidden
    />
  );
}
