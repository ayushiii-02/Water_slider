varying float vZPos;
varying float vRecess;
varying vec2 vUv;

uniform sampler2D u_texture;
uniform float u_hasTexture;
uniform float u_imageAspect;
uniform vec3 u_color;
uniform vec3 u_bgColor;
uniform float u_alphaFadeNear;
uniform float u_alphaFadeFar;
uniform float u_fogNear;
uniform float u_fogFar;
uniform float u_opacity;

vec2 coverUv(vec2 uv, float imageAspect) {
  float cardAspect = 1.0;
  float ratio = imageAspect / cardAspect;
  vec2 scale = vec2(1.0);

  if (ratio > 1.0) {
    scale.x = 1.0 / ratio;
  } else {
    scale.y = ratio;
  }

  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec3 col = u_color;

  if (u_hasTexture > 0.5) {
    col = texture2D(u_texture, coverUv(vUv, u_imageAspect)).rgb;
  }

  col += vZPos * 3.5 * (1.0 - vRecess);
  col *= 1.0 - vRecess * 0.1;

  float depth = gl_FragCoord.z / gl_FragCoord.w;

  float alphaFade = smoothstep(u_alphaFadeFar, u_alphaFadeNear, depth);
  float fogFactor = smoothstep(u_fogNear, u_fogFar, depth);
  fogFactor *= mix(1.0, 0.15, u_hasTexture);

  col = mix(col, u_bgColor, fogFactor);

  float alpha = min(alphaFade * u_opacity, 1.0);

  gl_FragColor = vec4(col, alpha);
}
