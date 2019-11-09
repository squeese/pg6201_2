/* eslint import/no-webpack-loader-syntax: off */
// import test from '!!raw-loader!./test.glsl';

const FLOAT = v => v % 1 === 0 ? `${v}.0` : v;

export const VertexUpdate = ({ size, roomSize, insideAlpha, outsideAlpha, speed }) => `#version 300 es
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uLight;
  uniform float uMinDuration;
  uniform float uMaxDuration;
  layout(location=0) in vec3 aPosition;
  layout(location=1) in vec3 aVelocity;
  layout(location=2) in float aDuration;
  layout(location=3) in float aLapsed;
  out vec3 vPosition;
  out vec3 vVelocity;
  out float vDuration;
  out float vLapsed;
  out vec4 vColor;
  float rand(vec2 co){
    return (fract(sin(dot(co.xy, vec2(2.43, 235.02))) * 78.53) * 2.0 - 1.0) * ${FLOAT(roomSize)};
  }
  void main() {
    if (aLapsed > aDuration) {
      vPosition = vec3(rand(aPosition.xy), rand(aPosition.yz), rand(aPosition.zx));
      vVelocity = normalize(vec3(rand(vPosition.zy), rand(vPosition.xz), rand(vPosition.xy))) * ${FLOAT(speed)};
      vDuration = uMinDuration + (uMaxDuration - uMinDuration) * rand(vPosition.xx);
      vLapsed = 0.0;
    } else {
      float uDeltaTime = 0.01;
      vec3 delta = aPosition * -1.0;
      float distance = max(0.01, dot(delta, delta));
      vec3 acceleration = 0.005 * normalize(delta);
      vPosition = aPosition + aVelocity * uDeltaTime;
      vVelocity = aVelocity + acceleration * uDeltaTime;
      vDuration = aDuration;
      vLapsed = aLapsed + uDeltaTime;
    }
    gl_PointSize = ${FLOAT(size)};
    gl_Position = uProjection * uView * vec4(vPosition, 1.0);

    vec4 P0 = uLight * vec4(vPosition, 1.0);
    vec3 P1 = P0.xyz / P0.w;
    float A = ${FLOAT(outsideAlpha)};
    if (P1.x > -0.99 && P1.x < 0.99 && P1.y > -0.99 && P1.y < 0.99 && P1.z > 0.0 && P1.z < 0.99)
      A = ${FLOAT(insideAlpha)};
    float Ain = min(aLapsed, 1.0);
    float Aut = min(aDuration - aLapsed, 1.0);
    vColor = vec4(1.0, 1.0, 1.0, A * Ain * Aut);
  }
`;

export const FragmentUpdate = () => `#version 300 es
  precision mediump float;
  in vec4 vColor;
  out vec4 fragColor;
  void main() {
    fragColor = vColor;
  }
`;