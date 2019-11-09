import React, { useRef, useEffect } from 'react';
import { mat4, vec3 } from 'gl-matrix';
import { Matrix4 } from 'three';
import suzanne from './deps/models/suzanneHighpoly.json';
import * as utils from './deps/utils';
import * as shaders from './Shaders';
import * as particles from './Particles';

/*

const createParticleProgram = (gl, proxy) => utils.createGenericProgram(gl, {
  vert: shaders.VERTEX_SHADER_SOURCE_PARTICLE(proxy.state),
  frag: shaders.FRAGMENT_SHADER_SOURCE_PARTICLE(proxy.state),
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
*/

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
    app.objectBox = utils.createGenericMesh(gl, utils.createFlatCubeMesh(1, true));
    app.objectSuzanne = utils.createGenericMesh(gl, suzanne);
    app.objectParticle = particles.createParticleSystem(gl, proxy.state.particle);

    // Create the uniform buffer objects
    app.uCamera = shaders.CAMERA_UNIFORM_BLOCK.create(gl);
    app.uMaterial = shaders.MATERIAL_UNIFORM_BLOCK.create(gl, proxy.state);
    app.uLightDirection = shaders.LIGHT_DIRECTIONS_UNIFORM.create(app.gl, proxy.state);
    app.uLightColor = shaders.LIGHT_COLORS_UNIFORM_BLOCK.create(app.gl, proxy.state);

    app.programObject = utils.createGenericProgram(gl, {
      vert: shaders.OBJECT_VERTEX_SHADER(proxy.state),
      frag: shaders.OBJECT_FRAGMENT_SHADER(proxy.state),
      after(program) {
        gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Camera'), 0);
        gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Material'), 1);
        gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Lights'), 2);
        this.uDirections = gl.getUniformLocation(program, 'uDirections');
        this.uInstance = gl.getUniformLocation(program, 'uInstance');
      },
    });

    app.program = utils.createGenericProgram(app.gl, {
      vert: `#version 300 es
        precision mediump float;
        ${shaders.CAMERA_UNIFORM_BLOCK()}
        uniform vec3 uColors[3];
        layout(location=0) in vec4 aPosition;
        layout(location=1) in vec3 aNormal;
        out vec3 vColor;
        void main() {
          gl_Position = uCamera.projection * uCamera.view * aPosition;
          vColor = vec3(1.0, 0.0, 0.0);
          vColor = uColors[1];
        }
      `,
      frag: `#version 300 es
        precision mediump float;
        in vec3 vColor;
        out vec4 fragColor;
        void main() {
          fragColor = vec4(vColor, 1.0);
        }
      `,
      after: program => {
        gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Camera'), 0);
      },
    });

    // The programs
    // app.objectProgram = createObjectProgram(app.gl, proxy);
    // app.particleProgram = createParticleProgram(app.gl, proxy);

    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, app.uCamera.__gpu);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 1, app.uMaterial.__gpu);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 2, app.uLightColor.__gpu);
  }, [app, canvas, proxy]);

  utils.useChange(true, function UpdateLightBuffersAndObjectProgram() {
    app.uLightColor.dispose();
    app.objectProgram.dispose();
    /*
    app.particleProgram.dispose();
    // Create the Uniform Buffer Objects that holds the light data
    app.uLightDirection = shaders.UNIFORM_BLOCK_LIGHT_DIRECTIONS.create(app.gl, proxy.state);
    app.uLightColor = shaders.UNIFORM_BLOCK_LIGHT_COLORS.create(app.gl, proxy.state);
    // Create the program that will render objects, using the light data
    app.objectProgram = createObjectProgram(app.gl, proxy);
    app.particleProgram = createParticleProgram(app.gl, proxy);

    app.colorsNeedUpdate = true;
    */

  }, [app, proxy, options.lights.length]);

  /*
  useEffect(function UpdateParticles() {
    if (!app.initialized) return;
    app.particleProgram.dispose();
    app.particleProgram = createParticleProgram(app.gl, proxy);
  }, [app, proxy, options.particle, options.points.length, options.boxes.length]);

  useEffect(function UpdateParticles() {
    if (!app.initialized) return;
    app.objectParticle.dispose();
    app.objectParticle = particles.createParticleSystem(app.gl, proxy.state.particle);
  }, [app, proxy, options.particle.count]);
  */

  useEffect(function UpdateMaterials() {
    options.objects.forEach((object, i) => {
      app.uMaterial.diffuse[i](object.diffuse);
      app.uMaterial.specular[i](object.specular);
      app.uMaterial.highlight[i](object.highlight);
    });
  }, [app, proxy, options.objects]);

  useEffect(function UpdateLights() {
    shaders.loopLights(options.lights, ({ type, value }, i, j) => {
      app.uLightColor[type][i].diffuse(value.diffuse);
      app.uLightColor[type][i].specular(value.specular);
      if (type === 'box') {
        // direction
        // transform
      } else if (type === 'direction') {
        app.uLightColor.direction[i].direction(value.direction);
      } else if (type === 'point') {
        utils.copy(app.uLightDirection, value.position, j * 3);
      } else if (type === 'spot') {
        utils.copy(app.uLightDirection, value.position, j * 3);
        app.uLightColor.spot[i].direction(value.direction);
      }
    });
  }, [app, proxy, options.lights]);

  /*
  useEffect(function UpdateBoxes() {
    const shear = new Matrix4();
    options.boxes.forEach((box, index) => {
      const buf = app.uLightColor.boxes[index];
      buf.diffuse(box.diffuse);
      buf.specular(box.specular);
      mat4.identity(buf.transform());
      mat4.translate(buf.transform(), buf.transform(), box.position);
      shear.makeShear(...box.shear);
      mat4.multiply(buf.transform(), buf.transform(), shear.elements);
      mat4.rotateY(buf.transform(), buf.transform(), box.rotation[1]);
      mat4.rotateX(buf.transform(), buf.transform(), box.rotation[0]);
      mat4.rotateZ(buf.transform(), buf.transform(), box.rotation[2]);
      mat4.scale(buf.transform(), buf.transform(), box.scale);
      vec3.transformMat4(buf.direction(), [0, 0, -1], buf.transform());
      mat4.invert(buf.transform(), buf.transform());
    });
    app.colorsNeedUpdate = true;
  }, [app, proxy, options.boxes, options.points.length, options.boxes.length]);

  useEffect(() => {
    app.initialized = true;
  }, [app]);
  */

  utils.useDeltaAnimationFrame(60, dt => {
    const { gl } = app;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mouse(dt);
    gl.bindBuffer(gl.UNIFORM_BUFFER, app.uCamera.__gpu);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uCamera.__cpu);
    gl.bindBuffer(gl.UNIFORM_BUFFER, app.uMaterial.__gpu);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uMaterial.__cpu);
    gl.bindBuffer(gl.UNIFORM_BUFFER, app.uLightColor.__gpu);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uLightColor.__cpu);

    app.programObject.use();
    gl.uniform3fv(app.programObject.uDirections, app.uLightDirection);
    gl.uniform1i(app.programObject.uInstance, 0);
    app.objectBox.bind();
    gl.frontFace(gl.CW);
    gl.drawElements(gl.TRIANGLES, app.objectBox.count, gl.UNSIGNED_SHORT, 0);
    gl.frontFace(gl.CCW);

    // mouse(dt);
    // gl.bindBuffer(gl.UNIFORM_BUFFER, app.uCamera.__gpu);
    // gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uCamera.__cpu);

    // gl.bindBuffer(gl.UNIFORM_BUFFER, app.uMaterial.__gpu);
    // // gl.buff(gl.UNIFORM_BUFFER, app.uLightDirection.__gpu);

    // gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // render room
    // app.objectProgram.use();
    // app.objectBox.bind();
    // gl.frontFace(gl.CW);
    // gl.drawElements(gl.TRIANGLES, app.objectBox.count, gl.UNSIGNED_SHORT, 0);
    // gl.frontFace(gl.CCW);

    // render particles
    // app.particleProgram.use();
    // gl.uniform1f(app.payyrticleProgram.uDelta, dt / 60);
    // gl.uniform1f(app.particleProgram.uRandom, Math.random() * 2 - 1);
    // gl.enable(gl.BLEND);
    // gl.disable(gl.DEPTH_TEST);
    // const index = app.objectParticle.next();
    // gl.bindVertexArray(app.objectParticle.array[index]);
    // gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, app.objectParticle.feedback[index]);
    // gl.beginTransformFeedback(gl.POINTS);
    // gl.drawArrays(gl.POINTS, 0, proxy.state.particle.count);
    // gl.endTransformFeedback();
    // gl.enable(gl.DEPTH_TEST);
    // gl.disable(gl.BLEND);
  });

  return <canvas ref={canvas} />;
};