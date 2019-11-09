import React, { useRef, useEffect } from 'react';
import { mat4, vec3 } from 'gl-matrix';
import { Matrix4 } from 'three';
import * as utils from './../deps/utils';
import * as shader from './Shaders';
import * as particle from './ParticleSystem';

const createObjectProgram = (gl, proxy) => utils.createGenericProgram(gl, {
  vert: shader.VERTEX_SHADER_SOURCE_OBJECT(proxy.state),
  frag: shader.FRAGMENT_SHADER_SOURCE_OBJECT(proxy.state),
  after: program => {
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Camera'), 0);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'LightDirections'), 1);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'LightColors'), 2);
  },
});

const createParticleProgram = (gl, proxy) => utils.createGenericProgram(gl, {
  vert: shader.VERTEX_SHADER_SOURCE_PARTICLE(proxy.state),
  frag: shader.FRAGMENT_SHADER_SOURCE_PARTICLE(proxy.state),
  link(program) {
    gl.transformFeedbackVaryings(program, ['vPosition', 'vVelocity', 'vDuration', 'vLapsed'], gl.SEPARATE_ATTRIBS);
    utils.linkProgram(gl, program);
  },
  after(program) {
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Camera'), 0);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'LightColors'), 2);
    this.uDelta = gl.getUniformLocation(program, 'uDeltaTime');
    this.uRandom = gl.getUniformLocation(program, 'uRandom');
  },
});

export default ({ options, proxy }) => {
  const app = useRef({}).current;
  const canvas = useRef();
  const mouse = utils.useMouseCamera(app, canvas);
  utils.useFullscreenCanvas(app, canvas, proxy);

  useEffect(function Initialize() {
    const { gl } = app;
    gl.clearColor(0.3, 0.4, 0.6, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Create the meshes/systems
    app.boxMesh = utils.createGenericMesh(gl, utils.createFlatCubeMesh(1, true));
    app.particleSystem = particle.createParticleSystem(gl, proxy.state.particle);

    // Create the uniform buffer objects
    app.uCamera = shader.UNIFORM_BLOCK_CAMERA.create(gl);
    app.uLightDirection = shader.UNIFORM_BLOCK_LIGHT_DIRECTIONS.create(app.gl, proxy.state);
    app.uLightColor = shader.UNIFORM_BLOCK_LIGHT_COLORS.create(app.gl, proxy.state);

    // The programs
    app.objectProgram = createObjectProgram(app.gl, proxy);
    app.particleProgram = createParticleProgram(app.gl, proxy);

    // wat?
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, app.uCamera.__gpu);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, app.uLightDirection.__gpu);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 2, app.uLightColor.__gpu);
  }, [app, canvas, proxy]);

  useEffect(function UpdateLightBuffersAndObjectProgram() {
    if (!app.initialized) return;
    app.uLightDirection.dispose();
    app.uLightColor.dispose();
    app.objectProgram.dispose();
    app.particleProgram.dispose();
    // Create the Uniform Buffer Objects that holds the light data
    app.uLightDirection = shader.UNIFORM_BLOCK_LIGHT_DIRECTIONS.create(app.gl, proxy.state);
    app.uLightColor = shader.UNIFORM_BLOCK_LIGHT_COLORS.create(app.gl, proxy.state);
    // Create the program that will render objects, using the light data
    app.objectProgram = createObjectProgram(app.gl, proxy);
    app.particleProgram = createParticleProgram(app.gl, proxy);
    app.colorsNeedUpdate = true;
  }, [app, proxy, options.points.length, options.boxes.length]);

  useEffect(function UpdateParticles() {
    if (!app.initialized) return;
    app.particleProgram.dispose();
    app.particleProgram = createParticleProgram(app.gl, proxy);
  }, [app, proxy, options.particle, options.points.length, options.boxes.length]);

  useEffect(function UpdateParticles() {
    if (!app.initialized) return;
    app.particleSystem.dispose();
    app.particleSystem = particle.createParticleSystem(app.gl, proxy.state.particle);
  }, [app, proxy, options.particle.count]);

  useEffect(function UpdateLightPoints() {
    options.points.forEach((point, index) => {
      app.uLightDirection.points[index](point.position);
      app.uLightColor.points[index].ambient(point.ambient);
      app.uLightColor.points[index].diffuse(point.diffuse);
      app.uLightColor.points[index].specular(point.specular);
      app.uLightColor.points[index].highlight(point.highlight);
    });
    app.colorsNeedUpdate = true;
  }, [app, proxy, options.points, options.points.length, options.boxes.length]);

  useEffect(function UpdateBoxes() {
    const shear = new Matrix4();
    options.boxes.forEach((box, index) => {
      const buf = app.uLightColor.boxes[index];
      buf.diffuse(box.diffuse);
      buf.specular(box.specular);

      mat4.identity(buf.transform());
      shear.makeShear(...box.shear);

      // const LR = box.shear[0];
      // const TB = box.shear[1];
      // const N = box.scale[0];
      // const F = box.scale[1];
      // const frustum = mat4.frustum(mat4.create(), LR * -1, LR, TB * -1, TB, N, F);

      mat4.translate(buf.transform(), buf.transform(), box.position);

      mat4.multiply(buf.transform(), buf.transform(), shear.elements);

      // mat4.rotateY(buf.transform(), buf.transform(), box.shear[2] * -1);
      // mat4.rotateZ(buf.transform(), buf.transform(), box.shear[2] * -1);
      // mat4.rotateZ(buf.transform(), buf.transform(), box.shear[2] * -1);

      mat4.rotateY(buf.transform(), buf.transform(), box.rotation[1]);
      mat4.rotateX(buf.transform(), buf.transform(), box.rotation[0]);
      mat4.rotateZ(buf.transform(), buf.transform(), box.rotation[2]);

      mat4.scale(buf.transform(), buf.transform(), box.scale);

      // mat4.multiply(buf.transform(), buf.transform(), frustum);

      vec3.transformMat4(buf.direction(), [0, 0, -1], buf.transform());
      mat4.invert(buf.transform(), buf.transform());
    });
    app.colorsNeedUpdate = true;
  }, [app, proxy, options.boxes, options.points.length, options.boxes.length]);

  useEffect(() => {
    app.initialized = true;
  }, [app]);

  utils.useDeltaAnimationFrame(60, dt => {
    const { gl } = app;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update the orbital mouse stuffses
    mouse(dt);
    gl.bindBuffer(gl.UNIFORM_BUFFER, app.uCamera.__gpu);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uCamera.__cpu);
    if (app.colorsNeedUpdate) {
      gl.bindBuffer(gl.UNIFORM_BUFFER, app.uLightDirection.__gpu);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uLightDirection.__cpu);
      gl.bindBuffer(gl.UNIFORM_BUFFER, app.uLightColor.__gpu);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uLightColor.__cpu);
      app.colorsNeedUpdate = false;
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // render room
    app.objectProgram.use();
    app.boxMesh.bind();
    gl.frontFace(gl.CW);
    gl.drawElements(gl.TRIANGLES, app.boxMesh.count, gl.UNSIGNED_SHORT, 0);
    gl.frontFace(gl.CCW);

    // render particles
    app.particleProgram.use();
    gl.uniform1f(app.particleProgram.uDelta, dt / 60);
    gl.uniform1f(app.particleProgram.uRandom, Math.random() * 2 - 1);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    const index = app.particleSystem.next();
    gl.bindVertexArray(app.particleSystem.array[index]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, app.particleSystem.feedback[index]);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, proxy.state.particle.count);
    gl.endTransformFeedback();
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  });

  return <canvas ref={canvas} />;
};