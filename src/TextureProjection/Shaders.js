import { UBO, loop, fltstr } from './../deps/utils';

export const UNIFORM_BLOCK_CAMERA = () => `
  uniform Camera {
    mat4 projection;
    mat4 view;
    vec3 position;
  } uCamera;
`;

export const UNIFORM_BLOCK_LIGHT_DIRECTIONS = ({ points }) => `
  uniform LightDirections {
    vec3 points[${points.length}];
  } uLightDirection;
`;

export const UNIFORM_BLOCK_LIGHT_COLORS = ({ points, boxes }) => `
  struct Point {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float highlight;
  };
  struct Box {
    vec3 diffuse;
    vec3 specular;
    vec3 direction;
    mat4 transform;
  };
  uniform LightColors {
    Point points[${points.length}];
    Box boxes[${boxes.length}];
  } uLightColor;
`;

export const VARYING_LIGHT_POINT_DIRECTIONS = (inout, { points }) => `
  ${inout} vec3 vPointLightDirections[${points.length}];
`;

UNIFORM_BLOCK_CAMERA.create = gl => UBO.create(gl,
  UBO.mat4('projection'),
  UBO.mat4('view'),
  UBO.vec4('position')
);

UNIFORM_BLOCK_LIGHT_DIRECTIONS.create = (gl, { points }) => UBO.create(gl,
  UBO.array('points', points.length, UBO.vec3),
);

UNIFORM_BLOCK_LIGHT_COLORS.create = (gl, { points, boxes }) => UBO.create(gl,
  UBO.array('points', points.length, [
    UBO.vec3('ambient'),
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.float('highlight'),
  ]),
  UBO.array('boxes', boxes.length, [
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.vec3('direction'),
    UBO.mat4('transform'),
  ]),
);

export const VERTEX_SHADER_SOURCE_OBJECT = options => `#version 300 es
  precision mediump float;
  ${UNIFORM_BLOCK_CAMERA()}
  ${UNIFORM_BLOCK_LIGHT_DIRECTIONS(options)}
  layout(location=0) in vec4 aPosition;
  layout(location=1) in vec3 aNormal;
  ${VARYING_LIGHT_POINT_DIRECTIONS('out', options)}
  out vec3 vNormal;
  out vec3 vCamera;
  out vec3 vPosition;
  void main() {
    ${loop(options.points, i => `vPointLightDirections[${i}] = uLightDirection.points[${i}] - aPosition.xyz;`)}
    vNormal = aNormal;
    vCamera = uCamera.position - aPosition.xyz;
    vPosition = aPosition.xyz;
    gl_Position = uCamera.projection * uCamera.view * aPosition;
  }
`;

export const FRAGMENT_SHADER_SOURCE_OBJECT = options => `#version 300 es
  precision mediump float;
  ${UNIFORM_BLOCK_LIGHT_COLORS(options)}
  ${VARYING_LIGHT_POINT_DIRECTIONS('in', options)}
  in vec3 vNormal;
  in vec3 vCamera;
  in vec3 vPosition;
  out vec4 fragColor;
  void main() {
    vec3 diffuseColor = vec3(0.5);
    vec3 specularColor = vec3(1.0);
    vec3 finalAmbient = vec3(0.0);
    vec3 finalDiffuse = vec3(0.0);
    vec3 finalSpecular = vec3(0.0);

    vec3 N = normalize(vNormal);
    vec3 V = normalize(vCamera);
    vec3 L, H;
    float D;

    ${loop(options.points, i => `
      finalAmbient += uLightColor.points[${i}].ambient;
      L = normalize(vPointLightDirections[${i}]);
      D = 1.0 / length(vPointLightDirections[${i}]);
      finalDiffuse += diffuseColor * uLightColor.points[${i}].diffuse * max(dot(N, L), 0.0) * D;
      H = normalize(L + V);
      finalSpecular += specularColor * uLightColor.points[${i}].specular * pow(clamp(dot(N, H), 0.0, 1.0), uLightColor.points[${i}].highlight) * D;
    `)}

    // vec4 P0;
    // vec3 P1;
    // ${loop(options.boxes, i => `
    //   P0 = uLightColor.boxes[${i}].transform * vec4(vPosition, 1.0);
    //   P1 = P0.xyz / P0.w;
    //   if (P1.x >= -1.0 && P1.x <= 1.0 && P1.y >= -1.0 && P1.y <= 1.0 && P1.z >= 0.0 && P1.z <= 1.0) {
    //     L = uLightColor.boxes[${i}].direction;
    //     finalDiffuse += diffuseColor * uLightColor.boxes[${i}].diffuse * max(dot(N, L), 0.0);
    //     // H = normalize(L + V);
    //     // finalSpecular += specularColor * uLightColor.boxes[${i}].specular * pow(clamp(dot(N, H), 0.0, 1.0), 1.0);
    //   }
    // `)}

    fragColor = vec4(finalAmbient + finalDiffuse + finalSpecular, 1.0);
  }
`;

export const VERTEX_SHADER_SOURCE_PARTICLE = ({ particle, ...options }) => `#version 300 es
  ${UNIFORM_BLOCK_CAMERA()}
  ${UNIFORM_BLOCK_LIGHT_COLORS(options)}
  uniform float uDeltaTime;
  uniform float uRandom;
  layout(location=0) in vec3 aPosition;
  layout(location=1) in vec3 aVelocity;
  layout(location=2) in float aDuration;
  layout(location=3) in float aLapsed;
  out vec3 vPosition;
  out vec3 vVelocity;
  out float vDuration;
  out float vLapsed;
  out vec4 vColor;
  vec3 randv(vec3 v, float m) {
    float s = sin(dot(v, vec3(uRandom * 12.34, uRandom * 32.123, uRandom * 502.2))) * m;
    return vec3(fract(s * v.x) * 2.0 - 1.0, fract(s * v.y) * 2.0 - 1.0, fract(s * v.z) * 2.0 - 1.0);
  }
  float randf(float v) {
    return fract(v * uRandom * 992.34502);
  }
  void main() {
    if (aLapsed > aDuration) {
      vPosition = randv(aPosition, 12.34) * ${fltstr(particle.roomSize)};
      vVelocity = normalize(randv(aVelocity, 43.21)) * ${fltstr(particle.speed)};
      vDuration = ${fltstr(particle.minDuration)} + (${fltstr(particle.maxDuration)} - ${fltstr(particle.minDuration)}) * randf(aDuration);
      vLapsed = 0.0;
    } else {
      vec3 delta = aPosition * -1.0;
      float distance = max(0.01, dot(delta, delta));
      vec3 acceleration = 0.005 * normalize(delta);
      vPosition = aPosition + aVelocity * uDeltaTime;
      vVelocity = aVelocity + acceleration * uDeltaTime;
      vDuration = aDuration;
      vLapsed = aLapsed + uDeltaTime;
    }
    gl_PointSize = ${fltstr(particle.size)};
    gl_Position = uCamera.projection * uCamera.view * vec4(vPosition, 1.0);

    float alpha = ${fltstr(particle.outsideAlpha)};
    vec3 color = vec3(0.0);
    vec4 P0;
    vec3 P1;
    vec2 P2;
    float x;
    float y;
    ${loop(options.boxes, i => `
      P0 = uLightColor.boxes[${i}].transform * vec4(vPosition, 1.0);
      P1 = P0.xyz / P0.w;
      P2 = P1.xy * (0.4 / P1.z);
      /*
      x = max(1.0 + (max(abs(P1.x), 1.0) - 1.0) * -1.0, 0.0);
      y = max(1.0 + (max(abs(P1.y), 1.0) - 1.0) * -1.0, 0.0);
      alpha = x * y;
      */
      color += uLightColor.boxes[${i}].diffuse;
      // if (P1.x > -0.99 && P1.x < 0.99 && P1.y > -0.99 && P1.y < 0.99 && P1.z > 0.0 && P1.z < 0.99) {
        // alpha = ${fltstr(particle.insideAlpha)};
      // }
      if (P2.x > -0.99 && P2.x < 0.99 && P2.y > -0.99 && P2.y < 0.99) {
        alpha = ${fltstr(particle.insideAlpha)};
      }
    `)}
    vColor = vec4(color, alpha * min(aLapsed, 1.0) * min(aDuration - aLapsed, 1.0));
  }
`;

export const FRAGMENT_SHADER_SOURCE_PARTICLE = () => `#version 300 es
  precision mediump float;
  in vec4 vColor;
  out vec4 fragColor;
  void main() {
    fragColor = vColor;
  }
`;