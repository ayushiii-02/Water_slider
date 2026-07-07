varying vec2 vUv;

uniform vec3 uBgColor;

void main() {
  vec3 top = uBgColor * 1.08;
  vec3 bottom = uBgColor * 0.86;
  vec3 col = mix(bottom, top, vUv.y);

  vec2 c = vUv - 0.5;
  col *= 1.0 - dot(c, c) * 0.28;

  float grid = sin(vUv.x * 70.0) * sin(vUv.y * 55.0);
  col += grid * 0.018;

  gl_FragColor = vec4(col, 1.0);
}
