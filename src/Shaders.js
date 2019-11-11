import { UBO, loop } from './deps/utils';

const BOX = ({ type }) => type === 'box';
const DIRECTION = ({ type }) => type === 'direction';
const POINT = ({ type }) => type === 'point';
const SPOT = ({ type }) => type === 'spot';
const POSITIONAL = light => POINT(light) || SPOT(light);
export const loopLights = (lights, fn) => {
  let indexBox = 0;
  let indexDir = 0;
  let indexPnt = 0;
  let indexSpt = 0;
  let indexVar = 0;
  return lights.map(light => {
    if (BOX(light)) return fn(light, indexBox++);
    if (DIRECTION(light)) return fn(light, indexDir++);
    if (POINT(light)) return fn(light, indexPnt++, indexVar++);
    if (SPOT(light)) return fn(light, indexSpt++, indexVar++);
    return "";
  }).join("\n").trim();
};

export const CAMERA_UNIFORM_BLOCK = () => `
uniform Camera {
  mat4 projection;
  mat4 view;
  vec3 position;
} uCamera;
`.trim();

CAMERA_UNIFORM_BLOCK.create = gl => UBO.create(gl,
  UBO.mat4('projection'),
  UBO.mat4('view'),
  UBO.vec4('position')
);

export const MODEL_UNIFORM_BLOCK = ({ objects }) => `
uniform int uModID;
uniform Model {
  mat4 transform[${Math.max(1, objects.length)}];
  mat3 rotation[${Math.max(1, objects.length)}];
} uModel;
`.trim();

MODEL_UNIFORM_BLOCK.create = (gl, { objects }) => UBO.create(gl,
  UBO.array('transform', objects.length, UBO.mat4),
  UBO.array('rotation', objects.length, UBO.mat3),
);

export const MATERIAL_UNIFORM_BLOCK = ({ objects }) => `
uniform int uMatID;
uniform Material {
  vec3 diffuse[${Math.max(1, objects.length)}];
  vec3 specular[${Math.max(1, objects.length)}];
  float highlight[${Math.max(1, objects.length)}];
} uMaterial;
`.trim();

MATERIAL_UNIFORM_BLOCK.create = (gl, { objects }) => UBO.create(gl,
  UBO.array('diffuse', objects.length, UBO.vec3),
  UBO.array('specular', objects.length, UBO.vec3),
  UBO.array('highlight', objects.length, UBO.float),
  UBO.array('transform', objects.length, UBO.mat4),
);

export const LIGHT_DIRECTIONS_UNIFORM = ({ lights }) => {
  const count = lights.filter(POSITIONAL).length;
  return count > 0 ? `uniform vec3 uDirections[${count}];` : '';
};

LIGHT_DIRECTIONS_UNIFORM.create = (gl, { lights }) => {
  const count = lights.filter(POSITIONAL).length;
  return new Float32Array(count * 3);
};

export const LIGHT_DIRECTIONS_VARYING = (direction, { lights }) => {
  const count = lights.filter(POSITIONAL).length;
  return count > 0 ? `${direction} vec3 vDirections[${count}];` : '';
};

export const LIGHT_COLORS_UNIFORM_BLOCK = ({ lights }) => {
  const B = lights.filter(BOX).length;
  const D = lights.filter(DIRECTION).length;
  const P = lights.filter(POINT).length;
  const S = lights.filter(SPOT).length;
  return (B + D + P + S) === 0 ? '' : `
struct Box {
  vec3 diffuse;
  vec3 specular;
  vec3 direction;
  mat4 transform;
};
struct Direction {
  vec3 diffuse;
  vec3 specular;
  vec3 direction;
};
struct Point {
  vec3 diffuse;
  vec3 specular;
  float attenuation;
};
struct Spot {
  vec3 diffuse;
  vec3 specular;
  float angle;
  vec3 direction;
  float attenuation;
};
uniform Lights {
  ${B > 0 ? `Box box[${B}];` : ''} 
  ${D > 0 ? `Direction direction[${D}];` : ''} 
  ${P > 0 ? `Point point[${P}];` : ''} 
  ${S > 0 ? `Spot spot[${S}];` : ''} 
} uLights;`.trim();
};

LIGHT_COLORS_UNIFORM_BLOCK.create = (gl, { lights }) => UBO.create(gl,
  UBO.array('box', lights.filter(BOX).length, [
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.vec3('direction'),
    UBO.mat4('transform'),
  ]),
  UBO.array('direction', lights.filter(DIRECTION).length, [
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.vec3('direction'),
  ]),
  UBO.array('point', lights.filter(POINT).length, [
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.float('attenuation'),
  ]),
  UBO.array('spot', lights.filter(SPOT).length, [
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.float('angle'),
    UBO.vec3('direction'),
    UBO.float('attenuation'),
  ]),
);

const BOX_OBJECT_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(BOX).length ? '' : `
vec3 boxLightColor(int lindex, vec3 N, vec3 V) {
  vec4 pos4 = uLights.box[lindex].transform * vec4(vPosition, 1.0);
  vec3 pos3 = pos4.xyz / pos4.w;
  vec3 color = vec3(0.0);
  if (pos3.x > -1.0 && pos3.x < 1.0 && pos3.y > -1.0 && pos3.y < 1.0 && pos3.z > 0.0 && pos3.z < 1.0) {
    vec3 L = uLights.box[lindex].direction;
    color += diffuseColor(uLights.box[lindex].diffuse, N, L);
    color += specularColor(uLights.box[lindex].specular, N, L, V);
  }
  return color;
}`;

const DIRECTION_OBJECT_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(DIRECTION).length ? '' : `
vec3 directionLightColor(int lindex, vec3 N, vec3 V) {
  vec3 L = uLights.direction[lindex].direction;
  vec3 color = vec3(0.0);
  color += diffuseColor(uLights.direction[lindex].diffuse, N, L);
  color += specularColor(uLights.direction[lindex].specular, N, L, V);
  return color;
}`;

const POINT_OBJECT_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(POINT).length ? '' : `
vec3 pointLightColor(int lindex, int dindex, vec3 N, vec3 V) {
  vec3 L = normalize(vDirections[dindex]);
  float D = 1.0 / pow(length(vDirections[dindex]), uLights.point[lindex].attenuation);
  vec3 color = vec3(0.0);
  color += diffuseColor(uLights.point[lindex].diffuse, N, L);
  color += specularColor(uLights.point[lindex].specular, N, L, V);
  return color * D;
}`;

const SPOT_OBJECT_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(SPOT).length ? '' : `
vec3 spotLightColor(int lindex, int dindex, vec3 N, vec3 V) {
  vec3 L = normalize(vDirections[dindex]);
  float D = 1.0 / pow(length(vDirections[dindex]), uLights.spot[lindex].attenuation);
  float C = pow(clamp(dot(L, normalize(uLights.spot[lindex].direction)), 0.0, 1.0), uLights.spot[lindex].angle);
  vec3 color = vec3(0.0);
  color += diffuseColor(uLights.spot[lindex].diffuse, N, L);
  color += specularColor(uLights.spot[lindex].specular, N, L, V);
  return color * D * C;
}`;

export const OBJECT_VERTEX_SHADER = options => `#version 300 es
precision mediump float;
${CAMERA_UNIFORM_BLOCK()}
${MODEL_UNIFORM_BLOCK(options)}
${LIGHT_DIRECTIONS_UNIFORM(options)}
layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal;
out vec3 vNormal;
out vec3 vCamera;
out vec3 vPosition;
${LIGHT_DIRECTIONS_VARYING('out', options)}
void main() {
  vCamera = uCamera.position - aPosition.xyz;
  vNormal = mat3(uModel.transform[uModID]) * aNormal;
  // vNormal = uModel.rotation[uModID] * aNormal;
  vec4 position = uModel.transform[uModID] * aPosition;
  vPosition = position.xyz;
  ${loop(options.lights.filter(POSITIONAL), i =>`
  vDirections[${i}] = uDirections[${i}] - position.xyz;`)}
  gl_Position = uCamera.projection * uCamera.view * position;
}`.trim();

export const OBJECT_FRAGMENT_SHADER = options => `#version 300 es
precision mediump float;
${MATERIAL_UNIFORM_BLOCK(options)}
${LIGHT_COLORS_UNIFORM_BLOCK(options)}
${LIGHT_DIRECTIONS_VARYING('in', options)}
in vec3 vNormal;
in vec3 vCamera;
in vec3 vPosition;
out vec4 fragColor;
vec3 diffuseColor(vec3 color, vec3 N, vec3 L) {
  return uMaterial.diffuse[uMatID] * color * max(dot(N, L), 0.0);
}
vec3 specularColor(vec3 color, vec3 N, vec3 L, vec3 V) {
  vec3 H = normalize(L + V);
  return uMaterial.specular[uMatID] * color * pow(clamp(dot(N, H), 0.0, 1.0), uMaterial.highlight[uMatID]);
}
${BOX_OBJECT_LIGHT_COLOR_FUNCTION(options)}
${DIRECTION_OBJECT_LIGHT_COLOR_FUNCTION(options)}
${POINT_OBJECT_LIGHT_COLOR_FUNCTION(options)}
${SPOT_OBJECT_LIGHT_COLOR_FUNCTION(options)}
void main() {
  vec3 color = vec3(0.0);
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vCamera);
  ${loopLights(options.lights, (light, i, j) => {
    if (BOX(light))       return `color += boxLightColor(${i}, N, V);`;
    if (DIRECTION(light)) return `color += directionLightColor(${i}, N, V);`;
    if (POINT(light))     return `color += pointLightColor(${i}, ${j}, N, V);`;
    if (SPOT(light))      return `color += spotLightColor(${i}, ${j}, N, V);`;
  })}
  fragColor = vec4(color, 1.0);
}`;

const BOX_PARTICLE_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(BOX).length ? '' : `
vec3 boxLightColor(int lindex) {
  vec4 pos4 = uLights.box[lindex].transform * vec4(aPosition, 1.0);
  vec3 pos3 = pos4.xyz / pos4.w;
  if (pos3.x > -1.0 && pos3.x < 1.0 && pos3.y > -1.0 && pos3.y < 1.0 && pos3.z > 0.0 && pos3.z < 1.0) {
    return uDiffuse * uLights.box[lindex].diffuse;
  }
  return vec3(0.0);
}`;

const DIRECTION_PARTICLE_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(DIRECTION).length ? '' : `
vec3 directionLightColor(int lindex) {
  return uDiffuse * uLights.direction[lindex].diffuse;
}`;

const POINT_PARTICLE_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(POINT).length ? '' : `
vec3 pointLightColor(int lindex, int dindex) {
  vec3 l = uDirections[dindex] - aPosition;
  float D = 1.0 / pow(length(l), uLights.point[lindex].attenuation);
  return uDiffuse * uLights.point[lindex].diffuse * D;
}`;

const SPOT_PARTICLE_LIGHT_COLOR_FUNCTION = ({ lights }) => !lights.filter(SPOT).length ? '' : `
vec3 spotLightColor(int lindex, int dindex) {
  vec3 l = uDirections[dindex] - aPosition;
  vec3 L = normalize(l);
  float D = 1.0 / pow(length(l), uLights.spot[lindex].attenuation);
  float C = pow(clamp(dot(L, normalize(uLights.spot[lindex].direction)), 0.0, 1.0), uLights.spot[lindex].angle);
  return uDiffuse * uLights.spot[lindex].diffuse * D * C;
}`;

export const PARTICLE_VERTEX_SHADER = ({ particle, ...options }) => `#version 300 es
precision mediump float;
${CAMERA_UNIFORM_BLOCK()}
${LIGHT_COLORS_UNIFORM_BLOCK(options)}
${LIGHT_DIRECTIONS_UNIFORM(options)}
uniform vec3 uDiffuse;
uniform float uAlpha;
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
${BOX_PARTICLE_LIGHT_COLOR_FUNCTION(options)}
${DIRECTION_PARTICLE_LIGHT_COLOR_FUNCTION(options)}
${POINT_PARTICLE_LIGHT_COLOR_FUNCTION(options)}
${SPOT_PARTICLE_LIGHT_COLOR_FUNCTION(options)}
void main() {
  if (aLapsed > aDuration) {
    vPosition = randv(aPosition, 12.34) * ${particle.roomSize.floatString()};
    vVelocity = normalize(randv(aVelocity, 43.21)) * ${particle.speed.floatString()};
    vDuration = ${particle.minDuration.floatString()} + (${particle.maxDuration.floatString()} - ${particle.minDuration.floatString()}) * randf(aDuration);
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
  ${particle.scale ? `
  float VL = length(uCamera.position - aPosition);
  gl_PointSize = ${particle.size.floatString()} / VL;
  `:`
  gl_PointSize = ${particle.size.floatString()};`}
  gl_Position = uCamera.projection * uCamera.view * vec4(vPosition, 1.0);
  vec3 color = vec3(0.0);
  ${loopLights(options.lights, (light, i, j) => {
    if (BOX(light))       return `color += boxLightColor(${i});`;
    if (DIRECTION(light)) return `color += directionLightColor(${i});`;
    if (POINT(light))     return `color += pointLightColor(${i}, ${j});`;
    if (SPOT(light))      return `color += spotLightColor(${i}, ${j});`;
  })}
  float alphaEnter = min(vLapsed, 1.0);
  float alphaExit = min(vDuration - vLapsed, 1.0);
  vColor = vec4(color, uAlpha * alphaEnter * alphaExit);
}`;

export const PARTICLE_FRAGMENT_SHADER = () => `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 fragColor;
void main() {
  fragColor = vColor;
}`;