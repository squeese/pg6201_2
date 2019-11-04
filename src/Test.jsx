import React, { useRef, useEffect, useContext } from 'react';
import { mat4, quat, vec3 } from 'gl-matrix';
import { Context } from './deps/Options';
import * as utils from './deps/utils';
import * as T from './deps/three.module';

const PARTICLE_NUM = Math.pow(2, 16);
const PARTICLE_SIZE = '5.0';

export default () => {
  const canvas = useRef();
  const app = useRef({}).current;
  const { update, state:{ camera, light }, proxy } = useContext(Context);

  useEffect(function InitializeThreeJSApplication() {
    const gl = app.gl = canvas.current.getContext('webgl2');
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    gl.clearColor(0.3, 0.4, 0.6, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    app.projection = mat4.create();
    app.view = mat4.create();
    app.light = mat4.create();
    app.particles = createParticles(gl)
    app.rotation = quat.copy([], proxy.camera.rotation.read());
    app.offset = proxy.camera.offset.read();
  }, [app, canvas, proxy]);

  useEffect(function OptionsCameraChange() {
    app.projection = mat4.perspective(app.projection, camera.fov * Math.PI/180, window.innerWidth/window.innerHeight, 0.1, 100);
    // quat.copy(app.rotationTarget, camera.rotation);
  }, [app, camera]);

  useEffect(function OptionsLightChange() {
    mat4.identity(app.light);
    mat4.rotateY(app.light, app.light, light.rotation[1]);
    mat4.rotateX(app.light, app.light, light.rotation[0]);
    mat4.rotateZ(app.light, app.light, light.rotation[2]);
    mat4.scale(app.light, app.light, light.scale);
    const S0 = new T.Matrix4().makeShear(...light.shear);
    mat4.multiply(app.light, app.light, S0.elements);
    mat4.translate(app.light, app.light, light.translation);
    mat4.invert(app.light, app.light);
  }, [app, light]);

  useEffect(function MouseOrbitalEventsForCamera() {
    return utils.mouseMoveHandlerGLMatrix(canvas.current, delta => {
      update(({ camera }) => quat.multiply(camera.rotation, camera.rotation.read(), delta));
    });
  }, [canvas, update]);

  useEffect(function MouseZoomEventsForCamera() {
    return utils.mouseWheelHandler(canvas.current, delta => {
      update(({ camera }) => camera.offset.set(camera.offset.read() + delta * 0.1));
    });
  }, [canvas, update]);

  useEffect(function WindowResizeEvent() {
    return utils.windowResize((x, y) => {
      canvas.current.width = x;
      canvas.current.height = y;
      app.gl.viewport(0, 0, x, y);
      app.projection = mat4.perspective(app.projection, camera.fov * Math.PI/180, x/y, 0.1, 100);
    });
  }, [app, canvas, camera]);

  useEffect(function StartStopRenderLoop() {
    const position = [];
    const upwards = [];
    let request = requestAnimationFrame(function frame() {
      const { gl, particles } = app;
      // Camera orbitals
      app.offset = utils.lerp(app.offset, camera.offset, 0.05);
      quat.slerp(app.rotation, app.rotation, camera.rotation, 0.05);
      vec3.transformQuat(position, [0, 0, app.offset], app.rotation);
      vec3.transformQuat(upwards, [0, 1, 0], app.rotation);
      mat4.lookAt(app.view, position, [0, 0, 0], upwards);
      // Render particles
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      // Update particles
      // gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      gl.useProgram(particles.updateProgram);
      gl.uniformMatrix4fv(particles.updateProgram.uProjection, false, app.projection);
      gl.uniformMatrix4fv(particles.updateProgram.uView, false, app.view);
      gl.uniformMatrix4fv(particles.updateProgram.uLight, false, app.light);
      gl.bindVertexArray(particles.updateArrays[particles.index]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, particles.feedbackBuffers[particles.index]);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, PARTICLE_NUM);
      gl.endTransformFeedback();
      // Render particles
      // gl.useProgram(particles.renderProgram);
      // gl.uniformMatrix4fv(particles.renderProgram.uProjection, false, app.projection);
      // gl.uniformMatrix4fv(particles.renderProgram.uView, false, app.view);
      // gl.bindVertexArray(particles.renderArrays[particles.index]);
      // gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, PARTICLE_NUM);
      particles.index = (particles.index + 1) % 2;
      // Cleanup
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.useProgram(null);
      request = requestAnimationFrame(frame);
    });
    return () => window.cancelAnimationFrame(request);
  }, [app, camera]);

  return <canvas ref={canvas} />;
};

const createParticles = gl => {
  // Create the programs
  const updateProgram = utils.createProgram(gl, VertexUpdateSource, FragmentUpdateSource);
  const renderProgram = utils.createProgram(gl, VertexRenderSource, FragmentRenderSource);
  gl.transformFeedbackVaryings(updateProgram, ["vPosition", "vVelocity", "vDuration"], gl.SEPARATE_ATTRIBS);
  utils.linkProgram(gl, updateProgram);
  updateProgram.uProjection = gl.getUniformLocation(updateProgram, "uProjection");
  updateProgram.uView = gl.getUniformLocation(updateProgram, "uView");
  updateProgram.uLight = gl.getUniformLocation(updateProgram, "uLight");
  utils.linkProgram(gl, renderProgram);
  renderProgram.uProjection = gl.getUniformLocation(renderProgram, "uProjection");
  renderProgram.uView = gl.getUniformLocation(renderProgram, "uView");

  // The data to send down to the GPU buffers
  const vertexData = new Float32Array([ -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5,  0.5 ]);
  const indexData = new Uint16Array([0, 1, 2, 1, 3, 2]);
  const positionData = new Float32Array(PARTICLE_NUM * 3).map(() => (Math.random() * 2 - 1) * 5.0);
  const velocityData = new Float32Array(PARTICLE_NUM * 3).map(() => (Math.random() * 2 - 1) * 0.01);
  const durationData = new Float32Array(PARTICLE_NUM).map(() => Math.random() * 1.5);

  // Create the data buffers, transformfeedbacks and vertexarrays
  const vertexBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const positionBuffers = [gl.createBuffer(), gl.createBuffer()];
  const velocityBuffers = [gl.createBuffer(), gl.createBuffer()];
  const durationBuffers = [gl.createBuffer(), gl.createBuffer()];
  const feedbackBuffers = [gl.createTransformFeedback(), gl.createTransformFeedback()];
  const updateArrays = [gl.createVertexArray(), gl.createVertexArray()];
  const renderArrays = [gl.createVertexArray(), gl.createVertexArray()];

  // Populate the 'billboard' buffers with data
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  // Populate the 
  for (let i = 0; i < 2; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, velocityData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, durationBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, durationData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  for (let i = 0; i < 2; i++) {
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedbackBuffers[i]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, durationBuffers[(i + 1) % 2]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    gl.bindVertexArray(updateArrays[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
    gl.bindBuffer(gl.ARRAY_BUFFER, durationBuffers[i]);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    gl.bindVertexArray(renderArrays[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bindVertexArray(null);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  return {
    index: 0,
    updateProgram,
    renderProgram,
    updateArrays,
    renderArrays,
    feedbackBuffers,
  };
};

const VertexUpdateSource = `#version 300 es
  uniform mat4 uProjection;
  uniform mat4 uView;
  uniform mat4 uLight;
  layout(location=0) in vec3 aPosition;
  layout(location=1) in vec3 aVelocity;
  layout(location=2) in float aDuration;
  out vec3 vPosition;
  out vec3 vVelocity;
  out float vDuration;
  out vec4 vColor;
  float rand(vec2 co){
    return (fract(sin(dot(co.xy, vec2(2.43, 235.02))) * 78.53) * 2.0 - 1.0) * 2.0;
  }
  void main() {
    if (aDuration <= 0.0) {
      vPosition = vec3(rand(aPosition.xy), rand(aPosition.yz), rand(aPosition.zx));
      vVelocity = vec3(rand(vPosition.zy), rand(vPosition.xz), rand(vPosition.xy)) * 0.01;
      vDuration = 1.5;
    } else {
      float uDeltaTime = 0.01;
      vec3 delta = aPosition * -1.0;
      float distance = max(0.01, dot(delta, delta));
      vec3 acceleration = 0.005 * normalize(delta);
      vPosition = aPosition + aVelocity * uDeltaTime;
      vVelocity = aVelocity + acceleration * uDeltaTime;
      vDuration = aDuration - uDeltaTime;
    }
    gl_Position = uProjection * uView * vec4(vPosition, 1.0);
    vec4 P0 = uLight * vec4(vPosition, 1.0);
    vec3 P1 = P0.xyz / P0.w;
    float A = 0.1;
    // if (P1.x > -0.99 && P1.x < 0.99 && P1.y > -0.99 && P1.y < 0.99 && P1.z > -0.99 && P1.z < 0.99) {
    if (P1.x > -0.99 && P1.x < 0.99 && P1.y > -0.99 && P1.y < 0.99) {
      A = 1.0;
    }
    float T = 1.0 - abs(vDuration - 0.75) / 0.75;
    gl_PointSize = ${PARTICLE_SIZE};
    vColor = vec4(1.0, 1.0, 1.0, A * T * 0.4);
  }
`;

const FragmentUpdateSource = `#version 300 es
  precision mediump float;
  in vec4 vColor;
  out vec4 fragColor;
  void main() {
    fragColor = vColor;
  }
`;

const VertexRenderSource = `#version 300 es
  uniform mat4 uProjection;
  uniform mat4 uView;
  layout(location=0) in vec3 aPosition;
  layout(location=1) in vec2 aVertex;
  out vec2 vCoord;
  void main() {
    gl_Position = uProjection * uView * vec4(aPosition.xy + aVertex, aPosition.z, 1.0);
    vCoord = aVertex;
  }
`;

const FragmentRenderSource = `#version 300 es
  precision mediump float;
  in vec2 vCoord;
  out vec4 fragColor;
  void main() {
    float c = smoothstep(0.6, 0.0, length(vCoord));
    fragColor = vec4(1.0, 1.0, 1.0, c);
  }
`;


/*
    gl.bindVertexArray(app.vertexArray);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instancePositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const offsetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceOffsets), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribDivisor(1, 1);

    const rotationBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rotationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceRotations), gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribDivisor(2, 1);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceColors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribDivisor(3, 1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
*/