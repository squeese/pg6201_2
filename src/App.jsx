import React, { Fragment, useRef, useEffect, useState } from 'react';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { Matrix4 } from 'three';
import suzanne from './deps/models/suzanneHighpoly.json';
import Source from './deps/Source';
import * as utils from './deps/utils';
import * as shaders from './Shaders';
import * as particles from './Particles';
import * as blur from './Blur';

export default ({ options, proxy }) => {
  const app = useRef({}).current;
  const canvas = useRef();
  const updateMouse = utils.useMouseCamera(app, canvas);
  const [ meshVertSource, setMeshVertSource ] = useState('');
  const [ meshFragSource, setMeshFragSource ] = useState('');
  const [ partVertSource, setPartVertSource ] = useState('');
  const [ partFragSource, setPartFragSource ] = useState('');
  const [ fps, setFps ] = useState(0);
  const updateFps = utils.useFps(fps => setFps(fps));
  utils.useFullscreenCanvas(app, canvas, proxy);

  // Initializtion of the 'application', this is only run once
  useEffect(function InitializeApplication() {
    const { gl } = app;
    gl.clearColor(0.3, 0.4, 0.6, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Creating the buffers describing vertex layouts
    // The meshes are static, wont be needing recalculation, so we can 'instantiate' them
    // now, the particle system is created as the we get access to the options (or they change).
    app.boxMeshNormal = utils.createGenericMesh(gl, utils.createFlatCubeMesh(1, false));
    app.boxMeshInverted = utils.createGenericMesh(gl, utils.createFlatCubeMesh(1, true));
    app.suzanneMesh = utils.createGenericMesh(gl, suzanne);
    app.particles = null;
    app.blur = blur.createBlur(gl);

    // Uniform Buffer Objects
    // Same deal here, only the camera buffer will stay the same.
    // The material and model buffer depends on the amount of 'objects' in the scene,
    // and the direction and lights buffer depends on the amount of lights in the scene.
    // Camera buffer holds the projection/view and position.
    // Direction buffer holds position data from some light types that need to be calculated
    // into 'direction' vectors (in vertex shader) for the light calculations (in fragment).
    // Lights contain the colors etc.
    // Model contains the object transform, and material the color stuff.
    app.uCamera = shaders.CAMERA_UNIFORM_BLOCK.create(gl);
    app.uDirection = null;
    app.uLights = null;
    app.uModel = null;
    app.uMaterial = null;

    // Biding the buffers to the appropriate binding points, can only bind the camera
    // at this point, rest will be bound after they are created.
    app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, 0, app.uCamera.__gpu);

    // The two programs we will be using to render, meshProgram for rendering 3d objects in
    // the scene, and particleProgram for the particles
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
        this.uAlpha = gl.getUniformLocation(program, 'uAlpha');
      },
    });
    app.blurProgram = utils.createGenericProgram(gl, {
      vert: () => shaders.BLUR_VERTEX_SHADER(proxy.state),
      frag: () => shaders.BLUR_FRAGMENT_SHADER(proxy.state),
      after(program) {
        this.uColor = app.gl.getUniformLocation(program, 'uColor');
        this.uDelpth = gl.getUniformLocation(program, 'uDepth');
      },
    });
  }, [app, canvas, proxy]);

  // This is run everytime the 'objects' portion of the GUI changes.
  // We will need to recalculate the model and material buffer, aswell as
  // the meshProgram, it is just disposed here, since it will be automaticly
  // re-compiled when used.
  useEffect(function OnObjectCountChanges() {
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

  // This is run everytime the 'lights' changes (in size, and one of the light type
  // is changed). We will need to recalculate the light and direction buffers, aswell
  // as both of the programs.
  const prev = useRef();
  useEffect(() => {
    if (!hasLightsChanged(prev, options.lights)) return;
    if (app.uLights) {
      app.uLights.dispose(app.gl);
      app.meshProgram.dispose();
      app.particleProgram.dispose();
    }
    app.uDirection = shaders.LIGHT_DIRECTIONS_UNIFORM.create(app.gl, proxy.state);
    app.uLights = shaders.LIGHT_COLORS_UNIFORM_BLOCK.create(app.gl, proxy.state);
    app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, 3, app.uLights.__gpu);
  }, [app, prev, options.lights, proxy]);

  // Creating/updating the particle 'system', it only depends on the 'count' option
  useEffect(function OnParticleCountChanges() {
    if (app.particles)
      app.particles.dispose();
    app.particles = particles.createParticleSystem(app.gl, proxy.state);
  }, [app, proxy, options.particle.count]);

  // Recalculate the particleProgram anytime any particle-options changes, since
  // the vertex/fragment shader source 'hard-codes' the variables in, rather
  // than sending in the data as uniform data, yai, 0.01% performance boost =)
  useEffect(function  OnParticleOptionsChanges() {
    if (app.particleProgram)
      app.particleProgram.dispose();
    app.particleProgram.use();
    app.gl.uniform3fv(app.particleProgram.uDirections, app.uDirection);
  }, [app, proxy, options.particle]);

  // Anytime the object options changes, we update the unform buffer objects for
  // model and material, and upload the data to the GPU
  useEffect(() => {
    // Update the buffers
    options.objects.forEach((object, i) => {
      mat4.identity(app.uModel.transform[i]())
      mat4.translate(app.uModel.transform[i](), app.uModel.transform[i](), object.position);
      mat4.rotateY(app.uModel.transform[i](), app.uModel.transform[i](), object.rotation[1]);
      mat4.rotateX(app.uModel.transform[i](), app.uModel.transform[i](), object.rotation[0]);
      mat4.rotateZ(app.uModel.transform[i](), app.uModel.transform[i](), object.rotation[2]);
      mat4.scale(app.uModel.transform[i](), app.uModel.transform[i](), object.scale);
      mat3.fromMat4(app.uModel.rotation[i](), app.uModel.transform[i]());
      app.uMaterial.diffuse[i](object.diffuse);
      app.uMaterial.specular[i](object.specular);
      app.uMaterial.highlight[i](object.highlight);
    });
    // Send data to the GPU
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.uModel.__gpu);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.uModel.__cpu);
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.uMaterial.__gpu);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.uMaterial.__cpu);
  }, [app, proxy, options.objects]);

  // Anytime the light options changes, we update the uniform buffer objects for
  // directions and light, and upload the data to the GPU
  useEffect(() => {
    // Update the buffers, and yai for THREEJS! =D
    const shear = new Matrix4();
    shaders.loopLights(options.lights, ({ type, value }, i, j) => {
      app.uLights[type][i].diffuse(value.diffuse);
      app.uLights[type][i].specular(value.specular);
      if (type === 'box') {
        const transform = app.uLights.box[i].transform();
        mat4.identity(transform);
        mat4.translate(transform, transform, value.position);
        mat4.rotateY(transform, transform, utils.rad(value.rotation[1]));
        mat4.rotateX(transform, transform, utils.rad(value.rotation[0]));
        mat4.rotateZ(transform, transform, utils.rad(value.rotation[2]));
        shear.makeShear(...value.shear);
        mat4.multiply(transform, transform, shear.elements);
        mat4.scale(transform, transform, value.scale);
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
        app.uLights.spot[i].attenuation(value.attenuation);
        app.uLights.spot[i].angle(value.angle);
      }
    });
    // Upload the data to the GPU
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.uLights.__gpu);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.uLights.__cpu);
    app.meshProgram.use();
    app.gl.uniform3fv(app.meshProgram.uDirections, app.uDirection);
    app.particleProgram.use();
    app.gl.uniform3fv(app.particleProgram.uDirections, app.uDirection);
  }, [app, proxy, options.lights, options.objects.length]);

  // The render-loop
  utils.useDeltaAnimationFrame(60, dt => {
    updateFps();
    const { gl } = app;

    // Update the camera control etc
    updateMouse(dt);
    gl.bindBuffer(gl.UNIFORM_BUFFER, app.uCamera.__gpu);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, app.uCamera.__cpu);

    // gl.bindFramebuffer(gl.FRAMEBUFFER, app.blur.renderBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render objects in the scene
    app.meshProgram.use();
    for (let i = 0; i < app.uModel.transform.length && i < proxy.state.objects.length; i++) {
      gl.uniform1i(app.meshProgram.uModID, i);
      gl.uniform1i(app.meshProgram.uMatID, i);
      switch (proxy.state.objects[i].mesh) {
        case 'inverted cube':
          app.boxMeshInverted.bind();
          gl.frontFace(gl.CW);
          gl.drawElements(gl.TRIANGLES, app.boxMeshInverted.count, gl.UNSIGNED_SHORT, 0);
          gl.frontFace(gl.CCW);
          break;
        case 'suzanne':
          app.suzanneMesh.bind();
          gl.drawElements(gl.TRIANGLES, app.suzanneMesh.count, gl.UNSIGNED_SHORT, 0);
          break;
        default:
          app.boxMeshNormal.bind();
          gl.drawElements(gl.TRIANGLES, app.boxMeshNormal.count, gl.UNSIGNED_SHORT, 0);
          break;
      }
    }

    // Render the particles
    if (proxy.state.particle.enabled) {
      app.particleProgram.use();
      gl.uniform1f(app.particleProgram.uDelta, dt / 60);
      gl.uniform1f(app.particleProgram.uRandom, Math.random() * 2 - 1);
      gl.uniform3fv(app.particleProgram.uDiffuse, proxy.state.particle.diffuse);
      gl.uniform1f(app.particleProgram.uAlpha, proxy.state.particle.alpha);
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

    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // app.blurProgram.use();
    // gl.bindVertexArray(app.blur.vertexArray);
    // gl.uniform1i(app.blurProgram.uColor, 1);
    // gl.uniform1i(app.blurProgram.uDepth, 2);
    // gl.drawArrays(gl.TRIANGLES, 0, 6);
  });

  return (
    <Fragment>
      <canvas ref={canvas} />;
      <div style={{ position: 'fixed', bottom: 8, right: 8, color: 'white' }}>
        {fps}
      </div>
      <Source sources={[
        { name: 'MeshVert', source: meshVertSource },
        { name: 'MeshFrag', source: meshFragSource },
        { name: 'ParticleVert', source: partVertSource },
        { name: 'ParticleFrag', source: partFragSource },
      ]} />
    </Fragment>
  );
};

const hasLightsChanged = (ref, lights) => {
  const prev = ref.current;
  ref.current = lights;
  if (!prev) return true;
  if (prev.length !== lights.length) return true;
  for (let i = 0; i < lights.length; i++)
    if (lights[i].type !== prev[i].type) return true;
  return false;;
};