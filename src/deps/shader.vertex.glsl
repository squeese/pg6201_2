#version 300 es
#define attribute in
#define varying out
#define texture2D texture
precision highp float;
precision highp int;
#define HIGH_PRECISION
#define SHADER_NAME ShaderMaterial
#define VERTEX_TEXTURES
#define GAMMA_FACTOR 2
#define MAX_BONES 0
#define BONE_TEXTURE
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
#ifdef USE_INSTANCING
 attribute mat4 instanceMatrix;
#endif
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
#ifdef USE_TANGENT
	attribute vec4 tangent;
#endif
#ifdef USE_COLOR
	attribute vec3 color;
#endif
#ifdef USE_MORPHTARGETS
	attribute vec3 morphTarget0;
	attribute vec3 morphTarget1;
	attribute vec3 morphTarget2;
	attribute vec3 morphTarget3;
	#ifdef USE_MORPHNORMALS
		attribute vec3 morphNormal0;
		attribute vec3 morphNormal1;
		attribute vec3 morphNormal2;
		attribute vec3 morphNormal3;
	#else
		attribute vec3 morphTarget4;
		attribute vec3 morphTarget5;
		attribute vec3 morphTarget6;
		attribute vec3 morphTarget7;
	#endif
#endif
#ifdef USE_SKINNING
	attribute vec4 skinIndex;
	attribute vec4 skinWeight;
#endif
layout(location=1) in vec3 velocity;
layout(location=2) in float duration;
out vec3 vPosition;
out vec3 vVelocity;
out float vDuration;
out vec3 vColor;
vec3 Hash33(vec3 p, float l) {
  p = fract(p*vec3(123.82, 439.11, 23.7));
  p += dot(p, p+82.23);
  float r0 = fract(p.x*p.y) * 3.1415 * 2.0;
  float r1 = fract((p.y-0.5) * (p.z - 0.5)) * 3.1415;
  float r2 = fract(p.x + p.z);
  r2 = (1.0 - pow(r2, 5.0)) * l;
  float x = r2 * sin(r0) * cos(r1);
  float y = r2 * sin(r0) * sin(r1);
  float z = r2 * cos(r0);
  return vec3(x, y, z);
}
void main() {
  gl_PointSize = 2.0;
  float uMinDuration = 1.0;
  float uMaxDuration = 1.5;
  float uDeltaTime = 0.01;
  vec3 uOrigin = vec3(0.0);
  if (duration <= 0.0) {
    vec3 nv = Hash33(position, 2.0);
    vPosition = nv;
    vVelocity = normalize(position - vPosition) * 0.5;
    vDuration = uMinDuration + (uMaxDuration - uMinDuration) * normalize(nv).z;
  } else {
    float mass = 0.005;
    vec3 delta = position * -1.0;
    float distance = max(0.01, dot(delta, delta));
    vec3 acceleration = mass * normalize(delta);
    vPosition = position + velocity * uDeltaTime;
    vVelocity = velocity + acceleration * uDeltaTime;
    vDuration = duration - uDeltaTime;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vColor = vec3(0.5 - abs(min(1.0, duration / uMinDuration) - 0.5));
}