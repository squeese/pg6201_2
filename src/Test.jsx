import React, { useRef, useEffect, useContext } from 'react';
import { mat4, quat, vec3 } from 'gl-matrix';
import { Context } from './deps/Options';
import * as ParticleShader from './shaders/particle';
import monkeyLowpoly from './deps/models/suzanneLowpoly.json';
import * as utils from './deps/utils';
import * as T from './deps/three.module';

export default () => {
  const canvas = useRef();
  const app = useRef({}).current;
  const { update, state:{ camera, particle, light }, proxy } = useContext(Context);

  useEffect(function InitializeThreeJSApplication() {
    const gl = app.gl = canvas.current.getContext('webgl2');
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    gl.clearColor(0.3, 0.4, 0.6, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    app.projection = mat4.create();
    app.view = mat4.create();
    app.light = mat4.create();
    app.rotation = quat.copy([], proxy.camera.rotation.read());
    app.offset = proxy.camera.offset.read();
    app.uniform = utils.createProgramUniformHelper(gl);
    app.particle = {
      index: 0,
      count: null,
      programs: null,
      buffers: null,
    };
    app.monkey = {
      mesh: utils.createGenericMesh(gl, monkeyLowpoly),
      program: null,
    };
  }, [app, canvas, proxy]);

  useEffect(function StartStopRenderLoop() {
    const position = [];
    const upwards = [];
    let request = requestAnimationFrame(function frame() {
      const { gl, particle } = app;
      // Update
      app.offset = utils.lerp(app.offset, camera.offset, 0.05);
      quat.slerp(app.rotation, app.rotation, camera.rotation, 0.05);
      vec3.transformQuat(position, [0, 0, app.offset], app.rotation);
      vec3.transformQuat(upwards, [0, 1, 0], app.rotation);
      mat4.lookAt(app.view, position, [0, 0, 0], upwards);
      // Render
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (proxy.particle.depthTest.read()) {
        gl.enable(gl.DEPTH_TEST);
      } else {
        gl.disable(gl.DEPTH_TEST);
      }
      gl.useProgram(particle.programs.update);
      app.uniform(particle.programs.update, "uProjection").uniformMatrix4fv(false, app.projection);
      app.uniform(particle.programs.update, "uView").uniformMatrix4fv(false, app.view);
      app.uniform(particle.programs.update, "uLight").uniformMatrix4fv(false, app.light);
      gl.bindVertexArray(particle.buffers.updateArrays[particle.index]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, particle.buffers.feedback[particle.index]);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, particle.count);
      gl.endTransformFeedback();
      particle.index = (particle.index + 1) % 2;
      // Cleanup
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      gl.useProgram(null);
      request = requestAnimationFrame(frame);
    });
    return () => window.cancelAnimationFrame(request);
  }, [app, camera, proxy]);

  // Options panel 'Camera' changes
  useEffect(function OptionsCameraChange() {
    app.projection = mat4.perspective(app.projection, camera.fov * Math.PI/180, window.innerWidth/window.innerHeight, 0.1, 100);
  }, [app, camera]);

  // Options panel 'Particle' changes
  useEffect(function OptionsParticleChange() {
    if (app.particle.programs)
      app.particle.programs.dispose();
    app.particle.programs = createParticlePrograms(app.gl, particle);
    if (app.particle.count !== particle.count) {
      if (app.particle.buffer)
        app.particle.buffers.dispose();
      app.particle.buffers = createParticleBuffers(app.gl, particle);
      app.particle.count = particle.count;
    }
    app.gl.useProgram(app.particle.programs.update);
    app.uniform(app.particle.programs.update, "uMinDuration").uniform1f(particle.minDuration);
    app.uniform(app.particle.programs.update, "uMaxDuration").uniform1f(particle.maxDuration);
  }, [app, particle]);

  // Options panel 'Light' changes
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

  // Mousemovement -> move the camera
  useEffect(function MouseOrbitalEventsForCamera() {
    return utils.mouseMoveHandlerGLMatrix(canvas.current, delta => {
      update(({ camera }) => quat.multiply(camera.rotation, camera.rotation.read(), delta));
    });
  }, [canvas, update]);

  // Mousewheel -> zoom the camera
  useEffect(function MouseZoomEventsForCamera() {
    return utils.mouseWheelHandler(canvas.current, delta => {
      update(({ camera }) => camera.offset.set(camera.offset.read() + delta * 0.1));
    });
  }, [canvas, update]);

  // Resize the window, fix canvas/gl stuff
  useEffect(function WindowResizeEvent() {
    return utils.windowResize((x, y) => {
      canvas.current.width = x;
      canvas.current.height = y;
      app.gl.viewport(0, 0, x, y);
      app.projection = mat4.perspective(app.projection, camera.fov * Math.PI/180, x/y, 0.1, 100);
    });
  }, [app, canvas, camera]);

  return <canvas ref={canvas} />;
};

const createParticlePrograms = (gl, options) => {
  const updateProgram = utils.createProgram(gl,
    ParticleShader.VertexUpdate(options),
    ParticleShader.FragmentUpdate(options));
  gl.transformFeedbackVaryings(updateProgram, ["vPosition", "vVelocity", "vDuration", "vLapsed"], gl.SEPARATE_ATTRIBS);
  utils.linkProgram(gl, updateProgram);
  return {
    update: updateProgram,
    dispose: () => {
      gl.deleteProgram(updateProgram);
    },
  };
};

const createParticleBuffers = (gl, { count = 1024, roomSize, maxDuration, speed }) => {
  const positionData = new Float32Array(count * 3).map(() => (Math.random() * 2 - 1) * roomSize);
  const velocityData = new Float32Array(count * 3).map(() => (Math.random() * 2 - 1) * speed);
  const durationData = new Float32Array(count).map(() => Math.random() * maxDuration);
  const lapsedData = new Float32Array(count).map(() => Math.random() * maxDuration);
  const positionBuffers = [gl.createBuffer(), gl.createBuffer()];
  const velocityBuffers = [gl.createBuffer(), gl.createBuffer()];
  const durationBuffers = [gl.createBuffer(), gl.createBuffer()];
  const lapsedBuffers = [gl.createBuffer(), gl.createBuffer()];
  const feedbackBuffers = [gl.createTransformFeedback(), gl.createTransformFeedback()];
  const updateArrays = [gl.createVertexArray(), gl.createVertexArray()];

  // Populate the 'update' buffers with data
  for (let i = 0; i < 2; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocityBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, velocityData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, durationBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, durationData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, lapsedBuffers[i]);
    gl.bufferData(gl.ARRAY_BUFFER, lapsedData, gl.STREAM_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  for (let i = 0; i < 2; i++) {
    // Setup the transformFeedbacks
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedbackBuffers[i]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, durationBuffers[(i + 1) % 2]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 3, lapsedBuffers[(i + 1) % 2]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    // Setup the update vertexArrays
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
    gl.bindBuffer(gl.ARRAY_BUFFER, lapsedBuffers[i]);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(3);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return {
    updateArrays,
    feedback: feedbackBuffers,
    dispose: () => {
      for (let i = 0; i < 2; i++) {
        gl.deleteBuffer(positionBuffers[i]);
        gl.deleteBuffer(velocityBuffers[i]);
        gl.deleteBuffer(durationBuffers[i]);
        gl.deleteBuffer(lapsedBuffers[i]);
        gl.deleteVertexArray(updateArrays[i]);
        gl.deleteTransformFeedback(feedbackBuffers[i]);
      }
    },
  };
};


/*
const VertexRenderSource = () => `#version 300 es
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

const FragmentRenderSource = () => `#version 300 es
  precision mediump float;
  in vec2 vCoord;
  out vec4 fragColor;
  void main() {
    float c = smoothstep(0.6, 0.0, length(vCoord));
    fragColor = vec4(1.0, 1.0, 1.0, c);
  }
`;

const VertexShadowSource = `#version 300 es
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

const FragmentShadowSource = `#version 300 es
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
*/