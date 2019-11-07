import { UBO } from './../deps/utils';
const loop = (arr, fn) => arr.map((v, i) => fn(i, v)).join("");

const UNIFORM_BLOCK_CAMERA = `
  uniform Camera {
    mat4 projection;
    mat4 view;
    vec3 position;
  } uCamera;
`;

export const create_UNIFORM_BLOCK_CAMERA = gl => UBO.create(gl,
  UBO.mat4('projection'),
  UBO.mat4('view'),
  UBO.vec4('position')
);

const UNIFORM_BLOCK_LIGHT_DIRECTIONS = ({ points }) => `
  uniform LightPosition {
    vec3 points[${points.length}];
  } uLightPosition;
`;

export const create_UNIFORM_BLOCK_LIGHT_DIRECTIONS = (gl, { points }) => UBO.create(gl,
  UBO.array('points', points.length, UBO.vec3),
);

const UNIFORM_BLOCK_LIGHT_COLORS = ({ points, boxes }) => `
  struct Point {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
  };
  struct Box {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 direction;
    mat4 transform;
  };
  uniform LightColors {
    Point points[${points.length}];
    Box boxes[${boxes.length}];
  } uLightColors;
`;

export const create_UNIFORM_BLOCK_LIGHT_COLORS = (gl, { points, boxes }) => UBO.create(gl,
  UBO.array('points', points.length, [
    UBO.vec3('ambient'),
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
  ]),
  UBO.array('boxes', boxes.length, [
    UBO.vec3('ambient'),
    UBO.vec3('diffuse'),
    UBO.vec3('specular'),
    UBO.vec3('direction'),
    UBO.mat4('transform'),
  ]),
);

const VARYING_LIGHT_POINT_DIRECTIONS = (inout, { points }) => `
  ${inout} vec3 vPointLightDirections[${points.length}];
`;

export const Vertex = options => `#version 300 es
  precision mediump float;
  ${UNIFORM_BLOCK_CAMERA}
  ${UNIFORM_BLOCK_LIGHT_DIRECTIONS(options)}
  ${VARYING_LIGHT_POINT_DIRECTIONS('out', options)}
  layout(location=0) in vec4 aPosition;
  layout(location=1) in vec3 aNormal;
  ${OUT_LIGHT_POSITIONS(points.length)}
  out vec3 vNormal;
  out vec3 vCamera;
  void main() {
    ${loop(options.points, i => `vPointLightDirections[${i}] = normalize(uLightPosition.points[${i}] - aPosition.xyz);`)}
    vNormal = aNormal;
    vCamera = normalize(uCamera.position - aPosition.xyz);
    gl_Position = uCamera.projection * uCamera.view * aPosition;
  }
`;

export const Fragment = options => `#version 300 es
  precision mediump float;
  ${UNIFORM_BLOCK_LIGHT_COLORS(options)}
  ${VARYING_LIGHT_POINT_DIRECTIONS('in', options)}
  in vec3 vNormal;
  in vec3 vCamera;
  out vec4 fragColor;
  void main() {
    vec3 diffuseColor = vec3(0.7, 0.7, 0.7);
    vec3 specularColor = vec3(0.2, 0.2, 0.2);
    vec3 finalAmbient = vec3(0.0);
    vec3 finalDiffuse = vec3(0.0);
    vec3 finalSpecular = vec3(0.0);
    float diffuse = 0.0;
    float specular = 0.0;
    ${loop(options.points, i => `
    diffuseCoeff     = max(dot(vNormal, vPointLightDirections[${i}]), 0.0);
    // specularCoeff = pow(max(dot(vNormal, normalize(uLight.directionPosition[${i}] - vCamera)), 0.0), uMaterial.specularHighlight);

    finalAmbient     += uLight.points[${i}].ambient;
    finalDiffuse     += diffuseColor * uLight.points[${i}].diffuse * diffuse;
    // finalSpecular += uMaterial.specularColor * uLight.specularColor[${i}] * specular;
    `)}
    fragColor = vec4(finalAmbient + finalDiffuse, 1.0);
    // fragColor = vec4(vPointLightDirections[0], 1.0);
    // fragColor = vec4(uLight.points[0].position, 1.0);
    fragColor = vec4(uLight.boxes[0].ambient, 1.0);
  }
`;

/*
  struct PointLight {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 position;
  };
  struct BoxLight {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 direction;
    mat4 transform;
  };
  uniform Light {
    PointLight points[1];
    BoxLight boxes[1];
  } uLight;

  struct PointLight {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 position;
  };
  struct BoxLight {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 direction;
    mat4 transform;
  };
  uniform LightsFrag {
    PointLight points[${points.length}];
    BoxLight boxes[${boxes.length}];
  } uLight;
*/