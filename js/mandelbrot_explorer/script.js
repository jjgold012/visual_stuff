(function () {
  'use strict';

  const state = {
    mCenter: { x: -0.5, y: 0.0 },
    mScale: 3.0,
    maxIter: 100,
    palette: 0,
    customColor1: [1.0, 0.0, 0.0],
    customColor2: [0.0, 1.0, 0.0],
    customColor3: [0.0, 0.0, 1.0],
    smooth: true,
    juliaC: { x: -0.7, y: 0.27 },
    juliaLocked: false,
    jCenter: { x: 0.0, y: 0.0 },
    jScale: 2.0,
  };

  // DOM
  const $ = (id) => document.getElementById(id);
  const canvas = $('canvas');
  const iterSlider = $('iter-slider');
  const iterValue = $('iter-value');
  const infoCenter = $('info-center');
  const infoMzoom = $('info-mzoom');
  const infoJcenter = $('info-jcenter');
  const infoJzoom = $('info-jzoom');
  const lockText = $('lock-text');
  const resetBtn = $('reset-btn');
  const paletteBtns = document.querySelectorAll('.palette-btn');
  const customColorsDiv = $('custom-colors');
  const color1Input = $('color1');
  const color2Input = $('color2');
  const color3Input = $('color3');

  // ---------------------------------------------------------
  // GLSL shader (split-screen: left=M, right=J)
  // ---------------------------------------------------------
  const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2  u_m_center;
uniform float u_m_scale;
uniform vec2  u_j_center;
uniform float u_j_scale;
uniform vec2  u_resolution;
uniform int   u_max_iter;
uniform int   u_palette;
uniform vec3  u_custom1;
uniform vec3  u_custom2;
uniform vec3  u_custom3;
uniform float u_color_gamma;
uniform vec2  u_julia_c;
uniform int   u_smooth;

out vec4 fragColor;

float iter_count(vec2 c, vec2 z0) {
    vec2 z = z0;
    int i;
    for (i = 0; i < u_max_iter; i++) {
        float x = z.x * z.x - z.y * z.y + c.x;
        float y = 2.0 * z.x * z.y + c.y;
        z = vec2(x, y);
        if (dot(z, z) > 256.0) break;
    }
    if (i == u_max_iter) return 1.0;
    if (u_smooth == 0) {
        return float(i) / float(u_max_iter);
    }
    float lz = log(dot(z, z)) / 2.0;
    float nu = log(lz / log(2.0)) / log(2.0);
    return (float(i) + 1.0 - nu) / float(u_max_iter);
}

vec3 pal_cls(float t) {
    vec3 a = vec3(0,0,0.1), b = vec3(0,0.3,0.8), c = vec3(0,0.7,1), d = vec3(1);
    vec3 m = mix(a,b,smoothstep(0.0,0.3,t));
    m = mix(m,c,smoothstep(0.3,0.6,t));
    return mix(m,d,smoothstep(0.6,1.0,t));
}
vec3 pal_fire(float t) {
    vec3 a=vec3(.02,0,0),b=vec3(.8,.1,0),c=vec3(1,.6,0),d=vec3(1,.9,.4),e=vec3(1,1,.9);
    vec3 m=mix(a,b,smoothstep(0.,.25,t));m=mix(m,c,smoothstep(.25,.5,t));
    m=mix(m,d,smoothstep(.5,.75,t));return mix(m,e,smoothstep(.75,1.,t));
}
vec3 pal_rain(float t) { return .5+.5*cos(6.28318*(t+vec3(0,.33,.67))); }
vec3 pal_neon(float t) {
    vec3 c=vec3(0);c+=vec3(1,0,1)*exp(-30.*abs(t-.5));c+=vec3(0,1,1)*exp(-30.*abs(t-.65));
    c+=vec3(.2,1,0)*exp(-30.*abs(t-.8));c+=vec3(0,.3,1)*exp(-30.*abs(t-.35));return c;
}
vec3 pal_ocean(float t) {
    vec3 a=vec3(0,.05,.15),b=vec3(0,.3,.5),c=vec3(.1,.7,.8),d=vec3(.6,1,.9);
    vec3 r=mix(a,b,smoothstep(0.,.3,t));r=mix(r,c,smoothstep(.3,.6,t));
    return mix(r,d,smoothstep(.6,1.,t));
}
vec3 pal_gray(float t) { return vec3(t); }
vec3 pal_pastel(float t) { return .6+.4*cos(6.28318*(t+vec3(0,.25,.5))); }
vec3 pal_custom(float t,vec3 c1,vec3 c2,vec3 c3) {
    vec3 a=mix(c1,c2,smoothstep(0.,.5,t));return mix(a,c3,smoothstep(.5,1.,t));
}
vec3 get_col(float t) {
    if(t>=1.) return vec3(0);
    int p=u_palette;
    if(p==1)return pal_fire(t);if(p==2)return pal_rain(t);if(p==3)return pal_neon(t);
    if(p==4)return pal_ocean(t);if(p==5)return pal_gray(t);if(p==6)return pal_pastel(t);
    if(p==7)return pal_custom(t,u_custom1,u_custom2,u_custom3);
    return pal_cls(t);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float half_aspect = (u_resolution.x / u_resolution.y) / 2.0;

    vec2 c, z0;
    float t;

    if (uv.x < 0.5) {
        // Left half: Mandelbrot
        vec2 uv_m = vec2(uv.x * 2.0, uv.y);
        c = u_m_center + u_m_scale * vec2((uv_m.x * 2.0 - 1.0) * half_aspect, uv_m.y * 2.0 - 1.0);
        z0 = vec2(0.0);
        t = iter_count(c, z0);
    } else {
        // Right half: Julia
        vec2 uv_j = vec2((uv.x - 0.5) * 2.0, uv.y);
        z0 = u_j_center + u_j_scale * vec2((uv_j.x * 2.0 - 1.0) * half_aspect, uv_j.y * 2.0 - 1.0);
        c = u_julia_c;
        t = iter_count(c, z0);
    }

    float tg = pow(t, u_color_gamma);
    vec3 color = get_col(tg);
    fragColor = vec4(color, 1.0);
}`;

  const VS_SRC = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // ---------------------------------------------------------
  // WebGL
  // ---------------------------------------------------------
  let gl, prog, vao, uni;

  function setupGL() {
    gl = canvas.getContext('webgl2');
    if (!gl) { fail('WebGL2 not supported'); return false; }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VS_SRC);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, FRAGMENT_SHADER);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(fs));
      fail('Shader compile failed');
      return false;
    }
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      fail('Program link failed');
      return false;
    }

    uni = {};
    const names = ['u_m_center','u_m_scale','u_j_center','u_j_scale',
                   'u_resolution','u_max_iter','u_palette',
                   'u_custom1','u_custom2','u_custom3','u_color_gamma','u_julia_c','u_smooth'];
    for (const n of names) uni[n] = gl.getUniformLocation(prog, n);

    const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    return true;
  }

  function fail(msg) {
    document.body.innerHTML = `<p style="color:#fff;padding:40px;font-size:18px;font-family:sans-serif;">${msg}</p>`;
  }

  function render() {
    if (!gl) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    if (w === 0 || h === 0) return;

    const zoom = 3.0 / state.mScale;
    const gamma = Math.max(0.01, Math.pow(0.18, Math.log10(zoom + 1)));

    gl.viewport(0, 0, w, h);
    gl.useProgram(prog);
    gl.uniform2f(uni.u_m_center, state.mCenter.x, state.mCenter.y);
    gl.uniform1f(uni.u_m_scale, state.mScale);
    gl.uniform2f(uni.u_j_center, state.jCenter.x, state.jCenter.y);
    gl.uniform1f(uni.u_j_scale, state.jScale);
    gl.uniform2f(uni.u_resolution, w, h);
    gl.uniform1i(uni.u_max_iter, state.maxIter);
    gl.uniform1i(uni.u_palette, state.palette);
    gl.uniform3fv(uni.u_custom1, state.customColor1);
    gl.uniform3fv(uni.u_custom2, state.customColor2);
    gl.uniform3fv(uni.u_custom3, state.customColor3);
    gl.uniform1f(uni.u_color_gamma, gamma);
    gl.uniform2f(uni.u_julia_c, state.juliaC.x, state.juliaC.y);
    gl.uniform1i(uni.u_smooth, state.smooth ? 1 : 0);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  function fmt(v) { return v.toFixed(6); }
  function updateInfo() {
    infoCenter.textContent = fmt(state.mCenter.x) + ' + ' + fmt(state.mCenter.y) + 'i';
    const mz = 3.0 / state.mScale;
    infoMzoom.textContent = mz < 1e6 ? mz.toFixed(2) + 'x' : mz.toExponential(2) + 'x';
    infoJcenter.textContent = fmt(state.jCenter.x) + ' + ' + fmt(state.jCenter.y) + 'i';
    const jz = 2.0 / state.jScale;
    infoJzoom.textContent = jz < 1e6 ? jz.toFixed(2) + 'x' : jz.toExponential(2) + 'x';
    lockText.textContent = state.juliaLocked ? 'locked' : 'unlocked';
    lockText.style.color = state.juliaLocked ? '#64ff64' : '#ff6b6b';
  }

  // ---------------------------------------------------------
  // Coordinate helpers
  // ---------------------------------------------------------
  function screenToComplex(cx, cy, center, scale, isRightHalf) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const px = (cx - rect.left) * dpr;
    const py = (cy - rect.top) * dpr;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return { x: 0, y: 0 };
    const half_aspect = w / (2 * h);
    const halfW = w / 2;
    // For the right half, offset px by halfW so nx is 0..1 within that half
    const localPx = isRightHalf ? px - halfW : px;
    const nx = localPx / halfW;
    const ny = 1.0 - py / h;
    return {
      x: center.x + scale * ((nx * 2.0 - 1.0) * half_aspect),
      y: center.y + scale * (ny * 2.0 - 1.0),
    };
  }

  function isOnMandelbrotSide(cx) {
    const rect = canvas.getBoundingClientRect();
    return (cx - rect.left) < rect.width / 2;
  }
  function isOnJuliaSide(cx) {
    const rect = canvas.getBoundingClientRect();
    return (cx - rect.left) >= rect.width / 2;
  }

  // ---------------------------------------------------------
  // Mandelbrot interaction
  // ---------------------------------------------------------
  const mDrag = { active: false, anchor: { x: 0, y: 0 } };

  function mOnMouseDown(e) {
    if (!isOnMandelbrotSide(e.clientX)) return;
    mDrag.active = true;
    mDrag.anchor = screenToComplex(e.clientX, e.clientY, state.mCenter, state.mScale);
  }

  function mOnMouseMove(e) {
    if (!isOnMandelbrotSide(e.clientX)) return;
    const p = screenToComplex(e.clientX, e.clientY, state.mCenter, state.mScale);
    if (!state.juliaLocked) {
      state.juliaC = p;
      render();
    }
    if (!mDrag.active) return;
    state.mCenter.x += mDrag.anchor.x - p.x;
    state.mCenter.y += mDrag.anchor.y - p.y;
    mDrag.anchor = screenToComplex(e.clientX, e.clientY, state.mCenter, state.mScale);
    render();
    updateInfo();
  }

  // ---------------------------------------------------------
  // Julia interaction
  // ---------------------------------------------------------
  const jDrag = { active: false, anchor: { x: 0, y: 0 } };

  function jOnMouseDown(e) {
    if (!isOnJuliaSide(e.clientX)) return;
    jDrag.active = true;
    jDrag.anchor = screenToComplex(e.clientX, e.clientY, state.jCenter, state.jScale, true);
  }

  function jOnMouseMove(e) {
    if (!isOnJuliaSide(e.clientX) || !jDrag.active) return;
    const p = screenToComplex(e.clientX, e.clientY, state.jCenter, state.jScale, true);
    state.jCenter.x += jDrag.anchor.x - p.x;
    state.jCenter.y += jDrag.anchor.y - p.y;
    jDrag.anchor = screenToComplex(e.clientX, e.clientY, state.jCenter, state.jScale, true);
    render();
    updateInfo();
  }

  // ---------------------------------------------------------
  // Shared handlers
  // ---------------------------------------------------------
  function onMouseDown(e)    { mOnMouseDown(e); jOnMouseDown(e); }
  function onMouseUp()       { mDrag.active = false; jDrag.active = false; }

  function onMouseMove(e) {
    mOnMouseMove(e);
    jOnMouseMove(e);
  }

  function onClick(e) {
    if (!isOnMandelbrotSide(e.clientX)) return;
    state.juliaLocked = !state.juliaLocked;
    state.juliaC = screenToComplex(e.clientX, e.clientY, state.mCenter, state.mScale);
    render();
    updateInfo();
  }

  function onWheel(e) {
    const factor = e.deltaY < 0 ? 0.85 : 1.18;
    if (isOnMandelbrotSide(e.clientX)) {
      e.preventDefault();
      const p = screenToComplex(e.clientX, e.clientY, state.mCenter, state.mScale);
      state.mScale *= factor;
      const np = screenToComplex(e.clientX, e.clientY, state.mCenter, state.mScale);
      state.mCenter.x += p.x - np.x;
      state.mCenter.y += p.y - np.y;
    } else if (isOnJuliaSide(e.clientX)) {
      e.preventDefault();
      const p = screenToComplex(e.clientX, e.clientY, state.jCenter, state.jScale, true);
      state.jScale *= factor;
      const np = screenToComplex(e.clientX, e.clientY, state.jCenter, state.jScale, true);
      state.jCenter.x += p.x - np.x;
      state.jCenter.y += p.y - np.y;
    } else {
      return;
    }
    render();
    updateInfo();
  }

  function onResize() { render(); }

  // ---------------------------------------------------------
  // 4K Export
  // ---------------------------------------------------------
  const EXPORT_W = 7680;
  const EXPORT_H = 4320;

  // Single-fractal shader (no split-screen) for export
  const EXPORT_SHADER_SRC = `#version 300 es
precision highp float;
uniform vec2  u_center;
uniform float u_scale;
uniform vec2  u_resolution;
uniform int   u_max_iter;
uniform int   u_palette;
uniform vec3  u_custom1;
uniform vec3  u_custom2;
uniform vec3  u_custom3;
uniform float u_color_gamma;
uniform vec2  u_julia_c;
uniform int   u_export_mode;  // 0=Mandelbrot, 1=Julia
uniform int   u_smooth;
out vec4 fragColor;

float iter_count(vec2 c, vec2 z0) {
    vec2 z = z0;
    int i;
    for (i = 0; i < u_max_iter; i++) {
        float x = z.x * z.x - z.y * z.y + c.x;
        float y = 2.0 * z.x * z.y + c.y;
        z = vec2(x, y);
        if (dot(z, z) > 256.0) break;
    }
    if (i == u_max_iter) return 1.0;
    if (u_smooth == 0) {
        return float(i) / float(u_max_iter);
    }
    float lz = log(dot(z, z)) / 2.0;
    float nu = log(lz / log(2.0)) / log(2.0);
    return (float(i) + 1.0 - nu) / float(u_max_iter);
}
vec3 pal_cls(float t) {
    vec3 a = vec3(0,0,0.1), b = vec3(0,0.3,0.8), c = vec3(0,0.7,1), d = vec3(1);
    vec3 m = mix(a,b,smoothstep(0.0,0.3,t));m = mix(m,c,smoothstep(0.3,0.6,t));
    return mix(m,d,smoothstep(0.6,1.0,t));
}
vec3 pal_fire(float t) {
    vec3 a=vec3(.02,0,0),b=vec3(.8,.1,0),c=vec3(1,.6,0),d=vec3(1,.9,.4),e=vec3(1,1,.9);
    vec3 m=mix(a,b,smoothstep(0.,.25,t));m=mix(m,c,smoothstep(.25,.5,t));
    m=mix(m,d,smoothstep(.5,.75,t));return mix(m,e,smoothstep(.75,1.,t));
}
vec3 pal_rain(float t) { return .5+.5*cos(6.28318*(t+vec3(0,.33,.67))); }
vec3 pal_neon(float t) {
    vec3 c=vec3(0);c+=vec3(1,0,1)*exp(-30.*abs(t-.5));c+=vec3(0,1,1)*exp(-30.*abs(t-.65));
    c+=vec3(.2,1,0)*exp(-30.*abs(t-.8));c+=vec3(0,.3,1)*exp(-30.*abs(t-.35));return c;
}
vec3 pal_ocean(float t) {
    vec3 a=vec3(0,.05,.15),b=vec3(0,.3,.5),c=vec3(.1,.7,.8),d=vec3(.6,1,.9);
    vec3 r=mix(a,b,smoothstep(0.,.3,t));r=mix(r,c,smoothstep(.3,.6,t));
    return mix(r,d,smoothstep(.6,1.,t));
}
vec3 pal_gray(float t) { return vec3(t); }
vec3 pal_pastel(float t) { return .6+.4*cos(6.28318*(t+vec3(0,.25,.5))); }
vec3 pal_custom(float t,vec3 c1,vec3 c2,vec3 c3) {
    vec3 a=mix(c1,c2,smoothstep(0.,.5,t));return mix(a,c3,smoothstep(.5,1.,t));
}
vec3 get_col(float t) {
    if(t>=1.) return vec3(0); int p=u_palette;
    if(p==1)return pal_fire(t);if(p==2)return pal_rain(t);if(p==3)return pal_neon(t);
    if(p==4)return pal_ocean(t);if(p==5)return pal_gray(t);if(p==6)return pal_pastel(t);
    if(p==7)return pal_custom(t,u_custom1,u_custom2,u_custom3);return pal_cls(t);
}
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 c, z0;
    if (u_export_mode == 0) {
        c = u_center + u_scale * vec2((uv.x * 2.0 - 1.0) * aspect, uv.y * 2.0 - 1.0);
        z0 = vec2(0.0);
    } else {
        z0 = u_center + u_scale * vec2((uv.x * 2.0 - 1.0) * aspect, uv.y * 2.0 - 1.0);
        c = u_julia_c;
    }
    float t = iter_count(c, z0);
    float tg = pow(t, u_color_gamma);
    fragColor = vec4(get_col(tg), 1.0);
}`;

  async function exportFractal(mode, label) {
    // Create temp canvas
    const c = document.createElement('canvas');
    c.width = EXPORT_W;
    c.height = EXPORT_H;
    const g = c.getContext('webgl2');
    if (!g) { alert('WebGL2 needed for export'); return; }

    // Compile shaders
    const vs = g.createShader(g.VERTEX_SHADER);
    g.shaderSource(vs, VS_SRC); g.compileShader(vs);
    const fs = g.createShader(g.FRAGMENT_SHADER);
    g.shaderSource(fs, EXPORT_SHADER_SRC); g.compileShader(fs);
    if (!g.getShaderParameter(fs, g.COMPILE_STATUS)) {
      console.error(g.getShaderInfoLog(fs));
      alert('Export shader compile failed');
      return;
    }
    const prog = g.createProgram();
    g.attachShader(prog, vs); g.attachShader(prog, fs); g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
      console.error(g.getProgramInfoLog(prog));
      alert('Export program link failed');
      return;
    }

    function u(name) { return g.getUniformLocation(prog, name); }
    const center = mode === 0 ? state.mCenter : state.jCenter;
    const scale  = mode === 0 ? state.mScale  : state.jScale;
    // Use higher iterations for 4K detail
    const exportIter = Math.min(state.maxIter * 2, 2000);
    const zoom = 3.0 / state.mScale;
    const gamma = Math.max(0.01, Math.pow(0.18, Math.log10(zoom + 1)));

    // Fullscreen quad
    const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.bufferData(g.ARRAY_BUFFER, verts, g.STATIC_DRAW);
    const vao = g.createVertexArray();
    g.bindVertexArray(vao);
    g.enableVertexAttribArray(0);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
    g.bindVertexArray(null);

    g.viewport(0, 0, EXPORT_W, EXPORT_H);
    g.useProgram(prog);
    g.uniform2f(u('u_center'), center.x, center.y);
    g.uniform1f(u('u_scale'), scale);
    g.uniform2f(u('u_resolution'), EXPORT_W, EXPORT_H);
    g.uniform1i(u('u_max_iter'), exportIter);
    g.uniform1i(u('u_palette'), state.palette);
    g.uniform3fv(u('u_custom1'), state.customColor1);
    g.uniform3fv(u('u_custom2'), state.customColor2);
    g.uniform3fv(u('u_custom3'), state.customColor3);
    g.uniform1f(u('u_color_gamma'), gamma);
    g.uniform2f(u('u_julia_c'), state.juliaC.x, state.juliaC.y);
    g.uniform1i(u('u_export_mode'), mode);
    g.uniform1i(u('u_smooth'), state.smooth ? 1 : 0);
    g.bindVertexArray(vao);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8Array(EXPORT_W * EXPORT_H * 4);
    g.readPixels(0, 0, EXPORT_W, EXPORT_H, g.RGBA, g.UNSIGNED_BYTE, pixels);
    g.bindVertexArray(null);

    // Flip Y (gl readPixels gives bottom-first, we need top-first for canvas)
    const flipped = new Uint8Array(EXPORT_W * EXPORT_H * 4);
    for (let y = 0; y < EXPORT_H; y++) {
      const srcOff = y * EXPORT_W * 4;
      const dstOff = (EXPORT_H - 1 - y) * EXPORT_W * 4;
      flipped.set(pixels.subarray(srcOff, srcOff + EXPORT_W * 4), dstOff);
    }

    // Convert to ImageData and draw to 2d canvas for PNG encode
    const imgData = new ImageData(new Uint8ClampedArray(flipped), EXPORT_W, EXPORT_H);
    const c2d = document.createElement('canvas');
    c2d.width = EXPORT_W;
    c2d.height = EXPORT_H;
    const ctx = c2d.getContext('2d');
    ctx.putImageData(imgData, 0, 0);

    // Trigger download
    c2d.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}_8K_${new Date().toISOString().slice(0,19).replace(/[:-]/g,'')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  function setPalette(idx) {
    state.palette = idx;
    paletteBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.palette) === idx));
    customColorsDiv.classList.toggle('hidden', idx !== 7);
    render();
  }
  paletteBtns.forEach(b => b.addEventListener('click', () => setPalette(parseInt(b.dataset.palette))));

  iterSlider.addEventListener('input', () => {
    state.maxIter = parseInt(iterSlider.value, 10);
    iterValue.textContent = state.maxIter;
    render();
  });

  color1Input.addEventListener('input', () => {
    state.customColor1 = hex2rgb(color1Input.value);
    if (state.palette === 7) render();
  });
  color2Input.addEventListener('input', () => {
    state.customColor2 = hex2rgb(color2Input.value);
    if (state.palette === 7) render();
  });
  color3Input.addEventListener('input', () => {
    state.customColor3 = hex2rgb(color3Input.value);
    if (state.palette === 7) render();
  });

  $('smooth-toggle').addEventListener('change', () => {
    state.smooth = $('smooth-toggle').checked;
    render();
  });

  resetBtn.addEventListener('click', () => {
    state.mCenter = { x: -0.5, y: 0.0 }; state.mScale = 3.0;
    state.jCenter = { x: 0.0, y: 0.0 }; state.jScale = 2.0;
    state.juliaLocked = false;
    render(); updateInfo();
  });

  function hex2rgb(h) {
    return [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  function init() {
    // Export buttons
    $('export-m-btn').addEventListener('click', () => exportFractal(0, 'Mandelbrot'));
    $('export-j-btn').addEventListener('click', () => exportFractal(1, 'Julia'));

    if (!setupGL()) return;

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (isOnMandelbrotSide(t.clientX)) {
        mDrag.active = true;
        mDrag.anchor = screenToComplex(t.clientX, t.clientY, state.mCenter, state.mScale);
      } else {
        jDrag.active = true;
        jDrag.anchor = screenToComplex(t.clientX, t.clientY, state.jCenter, state.jScale, true);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (mDrag.active && isOnMandelbrotSide(t.clientX)) {
        const p = screenToComplex(t.clientX, t.clientY, state.mCenter, state.mScale);
        state.mCenter.x += mDrag.anchor.x - p.x;
        state.mCenter.y += mDrag.anchor.y - p.y;
        mDrag.anchor = screenToComplex(t.clientX, t.clientY, state.mCenter, state.mScale);
        render(); updateInfo();
      } else if (jDrag.active && isOnJuliaSide(t.clientX)) {
        const p = screenToComplex(t.clientX, t.clientY, state.jCenter, state.jScale, true);
        state.jCenter.x += jDrag.anchor.x - p.x;
        state.jCenter.y += jDrag.anchor.y - p.y;
        jDrag.anchor = screenToComplex(t.clientX, t.clientY, state.jCenter, state.jScale, true);
        render(); updateInfo();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', e => { e.preventDefault(); mDrag.active = false; jDrag.active = false; }, { passive: false });

    window.addEventListener('resize', onResize);
    render();
    updateInfo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();