#version 300 es
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

// ------------------------------------------------------------
// Smooth iteration count
// ------------------------------------------------------------
float mandelbrot_iter(vec2 c) {
    vec2 z = vec2(0.0);
    int i;
    for (i = 0; i < u_max_iter; i++) {
        // z = z^2 + c  (unrolled: z^2 = (x^2 - y^2, 2xy))
        float x = z.x * z.x - z.y * z.y + c.x;
        float y = 2.0 * z.x * z.y + c.y;
        z = vec2(x, y);
        if (dot(z, z) > 256.0) break;
    }
    if (i == u_max_iter) return 1.0; // inside set -> black

    // smooth iteration count:  n + 1 - log2(log2(|z|))
    float log_zn = log(dot(z, z)) / 2.0;
    float nu = log(log_zn / log(2.0)) / log(2.0);
    float t = float(i) + 1.0 - nu;
    return t / float(u_max_iter); // normalized to [0,1]
}

// ------------------------------------------------------------
// Color palettes (t in [0,1], 0=deep set, 1=far outside)
// ------------------------------------------------------------
vec3 palette_classic(float t) {
    // Deep blue to cyan to white
    vec3 a = vec3(0.0, 0.0, 0.1);
    vec3 b = vec3(0.0, 0.3, 0.8);
    vec3 c = vec3(0.0, 0.7, 1.0);
    vec3 d = vec3(1.0, 1.0, 1.0);
    vec3 mid = mix(a, b, smoothstep(0.0, 0.3, t));
    mid = mix(mid, c, smoothstep(0.3, 0.6, t));
    return mix(mid, d, smoothstep(0.6, 1.0, t));
}

vec3 palette_fire(float t) {
    // Black -> deep red -> orange -> yellow -> white
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
    // Black background, neon pop on escape zones
    float glow = exp(-20.0 * abs(t - 0.7));
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
    // blend between three user-selected colors
    vec3 a = mix(c1, c2, smoothstep(0.0, 0.5, t));
    return mix(a, c3, smoothstep(0.5, 1.0, t));
}

vec3 get_color(float t) {
    if (t >= 1.0) return vec3(0.0); // inside set -> black

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

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    // Aspect-ratio-corrected coordinate mapping
    float aspect = u_resolution.x / u_resolution.y;
    vec2 c = u_center + u_scale * vec2((uv.x * 2.0 - 1.0) * aspect, uv.y * 2.0 - 1.0);

    float t = mandelbrot_iter(c);
    vec3 color = get_color(t);

    // Simple gamma-ish tone mapping
    fragColor = vec4(color, 1.0);
}