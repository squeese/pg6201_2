import React, { Fragment, useRef, useEffect, useState } from 'react';
import { mat4, vec3 } from 'gl-matrix';
import { Matrix4 } from 'three';
import suzanne from './deps/models/suzanneHighpoly.json';
import Source from './deps/Source';
import * as utils from './deps/utils';
import * as shaders from './Shaders';
import * as particles from './Particles';

export default ({ options, proxy }) => {
  const app = useRef({}).current;
  const canvas = useRef();
  const mouse = utils.useMouseCamera(app, canvas);
  const [ meshVertSource, setMeshVertSource ] = useState('');
  const [ meshFragSource, setMeshFragSource ] = useState('');
  const [ partVertSource, setPartVertSource ] = useState('');
  const [ partFragSource, setPartFragSource ] = useState('');
  utils.useFullscreenCanvas(app, canvas, proxy);

  useEffect(function Initialize() {
    const { gl } = app;
    gl.clearColor(0.3, 0.4, 0.6, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    // Meshes etc,
    app.boxMesh = utils.createGenericMesh(gl, utils.createFlatCubeMesh(1, true));
    app.suzanneMesh = utils.createGenericMesh(gl, suzanne);
    app.particles = null;
    // Uniform Buffer Objects
    app.uCamera = shaders.CAMERA_UNIFORM_BLOCK.create(gl);
    app.uDirection = null;
    app.uModel = null;
    app.uMaterial = null;
    app.uLights = null;
    app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, 0, app.uCamera.__gpu);
    // Programs
    app.meshProgram = utils.createGenericProgram(app.gl, {
      vert: () => {
        const source = shaders.OBJECT_VERTEX_SHADER(proxy.state);
        setMeshVertSource(source);
        return source;
      },
      frag: () => {
        const source = shaders.OBJECT_FRAGMENT_SHADER(proxy.state);
        setMeshFragSource(source);
        return source;
      },
      after(program) {
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Camera'), 0);
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Model'), 1);
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Material'), 2);
        if (proxy.state.lights.length)
          app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Lights'), 3);
        this.uDirections = app.gl.getUniformLocation(program, 'uDirections');
        this.uModID = app.gl.getUniformLocation(program, 'uModID');
        this.uMatID = app.gl.getUniformLocation(program, 'uMatID');
      },
    });
    app.particleProgram = utils.createGenericProgram(gl, {
      vert: () => {
        const source = shaders.PARTICLE_VERTEX_SHADER(proxy.state);
        setPartVertSource(source);
        return source;
      },
      frag: () => {
        const source = shaders.PARTICLE_FRAGMENT_SHADER(proxy.state);
        setPartFragSource(source);
        return source;
      },
      link(program) {
        gl.transformFeedbackVaryings(program, ['vPosition', 'vVelocity', 'vDuration', 'vLapsed'], gl.SEPARATE_ATTRIBS);
        utils.linkProgram(gl, program);
      },
      after(program) {
        gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Camera'), 0);
        if (proxy.state.lights.length)
          app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Lights'), 3);
        this.uDirections = app.gl.getUniformLocation(program, 'uDirections');
        this.uDelta = gl.getUniformLocation(program, 'uDeltaTime');
        this.uRandom = gl.getUniformLocation(program, 'uRandom');
        this.uDiffuse = gl.getUniformLocation(program, 'uDiffuse');
      },
    });
  }, [app, canvas, proxy]);

  useEffect(() => {
    if (app.uModel) {
      app.uModel.dispose(app.gl);
      app.uMaterial.dispose(app.gl);
      app.meshProgram.dispose(app.gl);
    }
    app.uModel = shaders.MODEL_UNIFORM_BLOCK.create(app.gl, proxy.state);
    app.uMaterial = shaders.MATERIAL_UNIFORM_BLOCK.create(app.gl, proxy.state);
    app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, 1, app.uModel.__gpu);
    app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, 2, app.uMaterial.__gpu);
  }, [app, proxy, options.objects.length]);

  utils.useUpdatePrograms(options.lights, initial => {
    if (!initial) {
      app.uLights.dispose(app.gl);
      app.meshProgram.dispose();
      app.particleProgram.dispose();
    }
    app.particles = particles.createParticleSystem(app.gl, options);
    app.uDirection = shaders.LIGHT_DIRECTIONS_UNIFORM.create(app.gl, options);
    app.uLights = shaders.LIGHT_COLORS_UNIFORM_BLOCK.create(app.gl, options);
    app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, 3, app.uLights.__gpu);
  });

  useEffect(() => {
    options.objects.forEach((object, i) => {
      mat4.identity(app.uModel.transform[i]())
      mat4.translate(app.uModel.transform[i](), app.uModel.transform[i](), object.position);
      mat4.rotateY(app.uModel.transform[i](), app.uModel.transform[i](), object.rotation[1]);
      mat4.rotateX(app.uModel.transform[i](), app.uModel.transform[i](), object.rotation[0]);
      mat4.rotateZ(app.uModel.transform[i](), app.uModel.transform[i](), object.rotation[2]);
      mat4.scale(app.uModel.transform[i](), app.uModel.transform[i](), object.scale);
      app.uMaterial.diffuse[i](object.diffuse);
      app.uMaterial.specular[i](object.specular);
      app.uMaterial.highlight[i](object.highlight);
    });
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.uModel.__gpu);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.uModel.__cpu);
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.uMaterial.__gpu);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.uMaterial.__cpu);
  }, [app, proxy, options.objects]);

  useEffect(() => {
    const shear = new Matrix4();
    shaders.loopLights(options.lights, ({ type, value }, i, j) => {
      app.uLights[type][i].diffuse(value.diffuse);
      app.uLights[type][i].specular(value.specular);
      if (type === 'box') {
        const transform = app.uLights.box[i].transform();
        mat4.identity(transform);
        mat4.translate(transform, transform, value.position);
        mat4.rotateY(transform, transform, value.rotation[1]);
        mat4.rotateX(transform, transform, value.rotation[0]);
        mat4.rotateZ(transform, transform, value.rotation[2]);
        shear.makeShear(...value.shear);
        mat4.multiply(transform, transform, shear.elements);
        mat4.scale(transform, transform, value.scale);
        // app.uLights.box[i].direction([0, 0, -1]);
        const direction = app.uLights.box[i].direction();
        vec3.transformMat4(direction, [0, 0, -1], transform);
        vec3.normalize(direction, direction);
        mat4.invert(transform, transform);
      } else if (type === 'direction') {
        app.uLights.direction[i].direction(value.direction);
      } else if (type === 'point') {
        app.uLights.point[i].attenuation(value.attenuation);
        utils.copy(app.uDirection, value.position, j * 3);
      } else if (type === 'spot') {
        utils.copy(app.uDirection, value.position, j * 3);
        app.uLights.spot[i].direction(value.direction);
      }
    });
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.uLights.__gpu);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.uLights.__cpu);
    app.meshProgram.use();
    app.gl.uniform3fv(app.meshProgram.uDirections, app.uDirection);
    app.particleProgram.use();
    app.gl.uniform3fv(app.particleProgram.uDirections, app.uDirection);
  }, [app, proxy, options.lights]);

  useEffect(() => {
    if (app.particles)
      app.particles.dispose();
    app.particles = particles.createParticleSystem(app.gl, proxy.state);
  }, [app, proxy, options.particle.count]);

  useEffect(() => {
    if (app.particleProgram)
      app.particleProgram.dispose();
    app.particleProgram.use();
  }, [app, proxy, options.particle]);

  utils.useDeltaAnimationFrame(60, dt => {
    const { gl } = app;
    mouse(dt);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.UNIFORM_BUFFER, app.uCamera.__gpu);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uCamera.__cpu);

    app.meshProgram.use();
    for (let i = 0; i < app.uModel.transform.length && i < proxy.state.objects.length; i++) {
      gl.uniform1i(app.meshProgram.uModID, i);
      gl.uniform1i(app.meshProgram.uMatID, i);
      switch (proxy.state.objects[i].mesh) {
        case 'suzanne':
          app.suzanneMesh.bind();
          gl.drawElements(gl.TRIANGLES, app.suzanneMesh.count, gl.UNSIGNED_SHORT, 0);
          break;
        default:
          app.boxMesh.bind();
          gl.frontFace(gl.CW);
          gl.drawElements(gl.TRIANGLES, app.boxMesh.count, gl.UNSIGNED_SHORT, 0);
          gl.frontFace(gl.CCW);
          break;
      }
    }

    if (proxy.state.particle.enabled) {
      app.particleProgram.use();
      gl.uniform1f(app.particleProgram.uDelta, dt / 60);
      gl.uniform1f(app.particleProgram.uRandom, Math.random() * 2 - 1);
      gl.uniform3fv(app.particleProgram.uDiffuse, proxy.state.particle.diffuse);
      const index = app.particles.next();
      gl.bindVertexArray(app.particles.array[index]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, app.particles.feedback[index]);
      gl.beginTransformFeedback(gl.POINTS);
      if (proxy.state.particle.blend) gl.enable(gl.BLEND);
      if (!proxy.state.particle.depth) gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.POINTS, 0, app.particles.count);
      if (proxy.state.particle.blend) gl.disable(gl.BLEND);
      if (!proxy.state.particle.depth) gl.enable(gl.DEPTH_TEST);
      gl.endTransformFeedback();
    }
  });

  return (
    <Fragment>
      <canvas ref={canvas} />;
      <Source sources={[
        { name: 'MeshVert', source: meshVertSource },
        { name: 'MeshFrag', source: meshFragSource },
        { name: 'ParticleVert', source: partVertSource },
        { name: 'ParticleFrag', source: partFragSource },
      ]} />
    </Fragment>
  );
};

    /*
    app.meshProgram = utils.createGenericProgram(gl, {
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
    app.particleProgram.dispose();
    // Create the Uniform Buffer Objects that holds the light data
    app.uDirection = shaders.UNIFORM_BLOCK_LIGHT_DIRECTIONS.create(app.gl, proxy.state);
    app.uLightColor = shaders.UNIFORM_BLOCK_LIGHT_COLORS.create(app.gl, proxy.state);
    // Create the program that will render objects, using the light data
    app.meshProgram = createObjectProgram(app.gl, proxy);
    app.particleProgram = createParticleProgram(app.gl, proxy);

    app.colorsNeedUpdate = true;
    */

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

/*

*/