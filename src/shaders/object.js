export const ObjectVertexSource = `#version 300 es
  precision mediump float;
  uniform mat4 uProjection;
  uniform mat4 uView;
  layout(location=0) in vec3 aPosition;
  out vec3 vPosition;
  void main() {
    vPosition = vec4(aPosition).xyz;
    gl_Position = uProjection * uView * vec4(vPosition, 1.0);
  }
`;

export const ObjectFragmentSource = `#version 300 es
  precision mediump float;
  uniform mat4 uLightPosition;
  in vec3 vPosition;
  out vec4 fragColor;
  void main() {
    vec3 fromLightToFrag = (vPosition - uLightPosition);
    float lightFragdist = length(fromLightToFrag);
    fragColor = vec4(..., ..., ..., 1.0);
  }
`;