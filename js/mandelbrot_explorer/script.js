(function () {
  'use strict';

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const state = {
    center: { x: -0.5, y: 0.0 },
    scale: 3.0,
    maxIter: 100,
    palette: 0,
    customColor1: [1.0, 0.0, 0.0],
    customColor2: [0.0, 1.0, 0.0],
    customColor3: [0.0, 0.0, 1.0],
  };

  // For interaction
  const drag = { active: false, prevX: 0, prevY: 0, moved: false };

  // WebGL references
  let gl, program, canvas;
  let uCenter, uScale, uResolution, uMaxIter, uPalette;
  let uCustom1, uCustom2, uCustom3;
  let vao;

  // ---------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const canvasEl = $('canvas');
  const iterSlider = $('iter-slider');
  const iterValue = $('iter-value');
  const infoCenter = $('info-center');
  const infoZoom = $('info-zoom');
  const resetBtn = $('reset-btn');
  const paletteBtns = document.querySelectorAll('.palette-btn');
  const customColorsDiv = $('custom-colors');
  const color1Input = $('color1');
  const color2Input = $('color2');
  const color3Input = $('color3');

  // ---------------------------------------------------------
  // GLSL Fragment Shader (embedded to avoid MIME-type issues)
  // ---------------------------------------------------------
  const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2  u_center;
uniform float u_scale;
uniform vec2  u_resolution;
uniform int   u_max_iter;
uniform int   u_palette;
uniform vec3  u_custom_color1;
uniform vec3  u_custom_color2;
uniform vec3  u_custom_color3;

out vec4 fragColor;

float mandelbrot_iter(vec2 c) {
    vec2 z = vec2(0.0);
    int i;
    for (i = 0; i < u_max_iter; i++) {
        float x = z.x * z.x - z.y * z.y + c.x;
        float y = 2.0 * z.x * z.y + c.y;
        z = vec2(x, y);
        if (dot(z, z) > 256.0) break;
    }
    if (i == u_max_iter) return 1.0;
    float log_zn = log(dot(z, z)) / 2.0;
    float nu = log(log_zn / log(2.0)) / log(2.0);
    float t = float(i) + 1.0 - nu;
    return t / float(u_max_iter);
}

vec3 palette_classic(float t) {
    vec3 a = vec3(0.0, 0.0, 0.1);
    vec3 b = vec3(0.0, 0.3, 0.8);
    vec3 c = vec3(0.0, 0.7, 1.0);
    vec3 d = vec3(1.0, 1.0, 1.0);
    vec3 mid = mix(a, b, smoothstep(0.0, 0.3, t));
    mid = mix(mid, c, smoothstep(0.3, 0.6, t));
    return mix(mid, d, smoothstep(0.6, 1.0, t));
}

vec3 palette_fire(float t) {
    vec3 a = vec3(0.02, 0.0, 0.0);
    vec3 b = vec3(0.8, 0.1, 0.0);
    vec3 c = vec3(1.0, 0.6, 0.0);
    vec3 d = vec3(1.0, 0.9, 0.4);
    vec3 e = vec3(1.0, 1.0, 0.9);
    vec3 mid = mix(a, b, smoothstep(0.0, 0.25, t));
    mid = mix(mid, c, smoothstep(0.25, 0.5, t));
    mid = mix(mid, d, smoothstep(0.5, 0.75, t));
    return mix(mid, e, smoothstep(0.75, 1.0, t));
}

vec3 palette_rainbow(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

vec3 palette_neon(float t) {
    vec3 col = vec3(0.0);
    col += vec3(1.0, 0.0, 1.0) * exp(-30.0 * abs(t - 0.5));
    col += vec3(0.0, 1.0, 1.0) * exp(-30.0 * abs(t - 0.65));
    col += vec3(0.2, 1.0, 0.0) * exp(-30.0 * abs(t - 0.8));
    col += vec3(0.0, 0.3, 1.0) * exp(-30.0 * abs(t - 0.35));
    return col;
}

vec3 palette_ocean(float t) {
    vec3 deep  = vec3(0.0, 0.05, 0.15);
    vec3 mid   = vec3(0.0, 0.3, 0.5);
    vec3 shall = vec3(0.1, 0.7, 0.8);
    vec3 foam  = vec3(0.6, 1.0, 0.9);
    vec3 a = mix(deep, mid, smoothstep(0.0, 0.3, t));
    vec3 b = mix(mid, shall, smoothstep(0.3, 0.6, t));
    vec3 c = mix(shall, foam, smoothstep(0.6, 1.0, t));
    vec3 result = mix(a, b, smoothstep(0.0, 0.5, t));
    return mix(result, c, smoothstep(0.5, 1.0, t));
}

vec3 palette_grayscale(float t) {
    return vec3(t);
}

vec3 palette_pastel(float t) {
    return 0.6 + 0.4 * cos(6.28318 * (t + vec3(0.0, 0.25, 0.5)));
}

vec3 palette_custom(float t, vec3 c1, vec3 c2, vec3 c3) {
    vec3 a = mix(c1, c2, smoothstep(0.0, 0.5, t));
    return mix(a, c3, smoothstep(0.5, 1.0, t));
}

vec3 get_color(float t) {
    if (t >= 1.0) return vec3(0.0);
    int p = u_palette;
    if (p == 1) return palette_fire(t);
    else if (p == 2) return palette_rainbow(t);
    else if (p == 3) return palette_neon(t);
    else if (p == 4) return palette_ocean(t);
    else if (p == 5) return palette_grayscale(t);
    else if (p == 6) return palette_pastel(t);
    else if (p == 7) return palette_custom(t, u_custom_color1, u_custom_color2, u_custom_color3);
    else return palette_classic(t);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 c = u_center + u_scale * vec2((uv.x * 2.0 - 1.0) * aspect, uv.y * 2.0 - 1.0);
    float t = mandelbrot_iter(c);
    vec3 color = get_color(t);
    fragColor = vec4(color, 1.0);
}`;

  // ---------------------------------------------------------
  // WebGL helpers
  // ---------------------------------------------------------
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  // ---------------------------------------------------------
  // Fullscreen quad (covers clip space)
  // ---------------------------------------------------------
  function initQuad(gl) {
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  // ---------------------------------------------------------
  // Render the fractal
  // ---------------------------------------------------------
  function render() {
    if (!program) return;

    const w = canvas.width;
    const h = canvas.height;
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);

    gl.uniform2f(uCenter, state.center.x, state.center.y);
    gl.uniform1f(uScale, state.scale);
    gl.uniform2f(uResolution, w, h);
    gl.uniform1i(uMaxIter, state.maxIter);
    gl.uniform1i(uPalette, state.palette);
    gl.uniform3fv(uCustom1, state.customColor1);
    gl.uniform3fv(uCustom2, state.customColor2);
    gl.uniform3fv(uCustom3, state.customColor3);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  function updateInfo() {
    infoCenter.textContent =
      `${state.center.x.toFixed(10)} + ${state.center.y.toFixed(10)}i`;
    const zoom = 3.0 / state.scale;
    infoZoom.textContent = zoom < 1e6
      ? zoom.toFixed(2) + 'x'
      : zoom.toExponential(2) + 'x';
  }

  // ---------------------------------------------------------
  // Resize canvas to fill window (with HiDPI)
  // ---------------------------------------------------------
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    render();
  }

  // ---------------------------------------------------------
  // Coordinate helpers
  // ---------------------------------------------------------
  // Matches the GLSL shader mapping exactly:
  //   uv = gl_FragCoord.xy / resolution
  //   c.x = center.x + scale * ((uv.x * 2.0 - 1.0) * aspect)
  //   c.y = center.y + scale * ( uv.y * 2.0 - 1.0)
  //
  // IMPORTANT: gl_FragCoord.y = 0 is bottom; clientY = 0 is top.
  //            So we must flip Y: uv.y = 1 - (sy * dpr / h)
  function screenToComplex(sx, sy) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const aspect = w / h;
    const nx = (sx * dpr) / w;           // 0 left → 1 right
    const ny = 1.0 - (sy * dpr) / h;     // 1 top → 0 bottom (flipped for GL)
    return {
      x: state.center.x + state.scale * ((nx * 2.0 - 1.0) * aspect),
      y: state.center.y + state.scale * (ny * 2.0 - 1.0),
    };
  }

  // Zoom toward a screen point so that point stays fixed on screen
  function zoomAt(sx, sy, factor) {
    // Grab the complex coordinate under the cursor before scaling
    const p = screenToComplex(sx, sy);
    state.scale *= factor;
    // After scaling, adjust center so the same screen cursor maps back to p
    const newP = screenToComplex(sx, sy);
    state.center.x += p.x - newP.x;
    state.center.y += p.y - newP.y;
  }

  // The complex point under the mouse at the start of a drag
  let dragAnchor = { x: 0, y: 0 };

  // ---- Mouse events ----
  function onMouseDown(e) {
    drag.active = true;
    drag.prevX = e.clientX;
    drag.prevY = e.clientY;
    drag.moved = false;
    // Record the complex point under the mouse so we can keep it anchored
    dragAnchor = screenToComplex(e.clientX, e.clientY);
  }

  function onMouseMove(e) {
    if (!drag.active) return;
    drag.moved = true;

    // Re-anchor: keep dragAnchor fixed under the current mouse position.
    // Since screenToComplex now flips Y (clientY→GL), the inverse must match.
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    const aspect = w / h;

    const nx = (e.clientX * dpr) / w;
    const ny = 1.0 - (e.clientY * dpr) / h;   // same flip as screenToComplex

    // Solve: screenToComplex(e) == dragAnchor
    state.center.x = dragAnchor.x - state.scale * ((nx * 2.0 - 1.0) * aspect);
    state.center.y = dragAnchor.y - state.scale *  (ny * 2.0 - 1.0);

    render();
    updateInfo();
  }

  function onMouseUp() {
    drag.active = false;
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.85 : 1.18;
    zoomAt(e.clientX, e.clientY, factor);
    render();
    updateInfo();
  }

  // ---- Touch events ----
  let touchStartDist = 0;
  let touchCenter = { x: 0, y: 0 };
  let pinchCenter = { x: 0, y: 0 };
  let touchAnchor = { x: 0, y: 0 };

  function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      drag.active = true;
      drag.prevX = e.touches[0].clientX;
      drag.prevY = e.touches[0].clientY;
      drag.moved = false;
      touchAnchor = screenToComplex(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      drag.active = false;
      touchStartDist = getTouchDist(e.touches[0], e.touches[1]);
      touchCenter.x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      touchCenter.y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      pinchCenter = screenToComplex(touchCenter.x, touchCenter.y);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && drag.active) {
      const t = e.touches[0];
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width;
      const h = canvas.height;
      const aspect = w / h;

      const nx = (t.clientX * dpr) / w;
      const ny = 1.0 - (t.clientY * dpr) / h;   // same flip as screenToComplex

      state.center.x = touchAnchor.x - state.scale * ((nx * 2.0 - 1.0) * aspect);
      state.center.y = touchAnchor.y - state.scale *  (ny * 2.0 - 1.0);

      drag.moved = true;
      render();
      updateInfo();
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const scaleFactor = touchStartDist / dist;

      state.scale *= scaleFactor;
      const newP = screenToComplex(touchCenter.x, touchCenter.y);
      state.center.x += pinchCenter.x - newP.x;
      state.center.y += pinchCenter.y - newP.y;

      touchStartDist = dist;
      render();
      updateInfo();
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    drag.active = false;
  }

  // ---------------------------------------------------------
  // UI event binding
  // ---------------------------------------------------------
  function setPalette(index) {
    state.palette = index;
    paletteBtns.forEach((btn) =>
      btn.classList.toggle('active', parseInt(btn.dataset.palette) === index)
    );
    customColorsDiv.classList.toggle('hidden', index !== 7);
    render();
  }

  paletteBtns.forEach((btn) => {
    btn.addEventListener('click', () => setPalette(parseInt(btn.dataset.palette)));
  });

  iterSlider.addEventListener('input', () => {
    state.maxIter = parseInt(iterSlider.value, 10);
    iterValue.textContent = state.maxIter;
    render();
  });

  color1Input.addEventListener('input', () => {
    state.customColor1 = hexToRgb(color1Input.value);
    if (state.palette === 7) render();
  });
  color2Input.addEventListener('input', () => {
    state.customColor2 = hexToRgb(color2Input.value);
    if (state.palette === 7) render();
  });
  color3Input.addEventListener('input', () => {
    state.customColor3 = hexToRgb(color3Input.value);
    if (state.palette === 7) render();
  });

  resetBtn.addEventListener('click', () => {
    state.center.x = -0.5;
    state.center.y = 0.0;
    state.scale = 3.0;
    render();
    updateInfo();
  });

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  function init() {
    canvas = canvasEl;
    gl = canvas.getContext('webgl2');

    if (!gl) {
      document.body.innerHTML =
        '<p style="color:#fff;padding:40px;font-size:20px;">WebGL2 is not supported in this browser.</p>';
      return;
    }

    // Vertex shader
    const vsSrc = `#version 300 es
      precision highp float;
      layout(location = 0) in vec2 a_pos;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }`;

    const fsSrc = FRAGMENT_SHADER;
    program = createProgram(gl, vsSrc, fsSrc);
    if (!program) {
      document.body.innerHTML =
        '<p style="color:#fff;padding:40px;font-size:20px;">Shader compilation failed. Check console for details.</p>';
      return;
    }

    // Uniform locations
    uCenter     = gl.getUniformLocation(program, 'u_center');
    uScale      = gl.getUniformLocation(program, 'u_scale');
    uResolution = gl.getUniformLocation(program, 'u_resolution');
    uMaxIter    = gl.getUniformLocation(program, 'u_max_iter');
    uPalette    = gl.getUniformLocation(program, 'u_palette');
    uCustom1    = gl.getUniformLocation(program, 'u_custom_color1');
    uCustom2    = gl.getUniformLocation(program, 'u_custom_color2');
    uCustom3    = gl.getUniformLocation(program, 'u_custom_color3');

    vao = initQuad(gl);

    // Bind mouse / touch
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Resize
    window.addEventListener('resize', resizeCanvas);

    resizeCanvas();
    updateInfo();
  }

  // Kick off
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();