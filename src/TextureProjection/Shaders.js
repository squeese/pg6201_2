export const Vertex = ({ points, boxes }) => `#version 300 es
  layout(std140, column_major) uniform;
  uniform Camera {
    mat4 projection;
    mat4 view;
    vec3 position;
  } uCamera;
  layout(location=0) in vec4 aPosition;
  out vec2 vTexcoord;
  void main() {
    gl_Position = uCamera.projection * uCamera.view * aPosition;
  }
`;

export const Fragment = ({ points, boxes }) => `#version 300 es
  precision mediump float;
  layout(std140, column_major) uniform;
  uniform Lights {
    vec3 color;
  } uLights;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(uLights.color, 1.0);
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
  uniform Lights {
    PointLight points[${points.length}];
    BoxLight boxes[${boxes.length}];
    vec4 color;
  } uLights;
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

*/