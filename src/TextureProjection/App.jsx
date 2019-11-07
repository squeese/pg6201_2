import React, { useRef, useEffect } from 'react';
import * as utils from './../deps/utils';
import * as shader from './Shaders';
import { useGUIChanges } from './GUI';

// in vec3 Bn;     // worldBinormal, right (x)
// in vec3 Tn;     // worldTangent, up (y)
// in vec3 Nn;     // worldNormal, forward (z)
// vec3 normal;
// vec3 L = normalize(In.lightVec.xyz);
// vec3 V = normalize(In.eyeVec.xyz);
// bring vectors to the same space when doing math on then, worldspace, object space etc..




export default ({ options }) => {
  const canvas = useRef();
  const app = useRef({}).current;
  utils.useCanvas(app, canvas, options);

  useEffect(function Initialize() {
    const { gl } = app;
    gl.clearColor(0.3, 0.4, 0.6, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    app.boxMesh = utils.createGenericMesh(gl, utils.createFlatCubeMesh(1, true));

    app.uCamera = shader.create_UNIFORM_BLOCK_CAMERA(app.gl);
    app.uLightDirections = shader.create_UNIFORM_BLOCK_LIGHT_DIRECTIONS(app.gl, options.state);
    app.uLightColors = shader.create_UNIFORM_BLOCK_LIGHT_COLORS(app.gl, options.state);

    /*
    app.UBOCamera = utils.createUniformBufferObject(gl, $ => [
      $.mat4('projection'),
      $.mat4('view'),
      $.vec3('position'),
    ]);
    app.UBOLights = utils.createUniformBufferObject(gl, $ => [
      $.array('points', options.state.points.length, [
        $.vec3('ambient'),
        $.vec3('diffuse'),
        $.vec3('specular'),
        $.vec3('position'),
      ]),
      $.padUniformBufferOffsetAlignment(),
      $.array('boxes', options.state.boxes.length, [
        $.vec3('ambient'),
        $.vec3('diffuse'),
        $.vec3('specular'),
        $.vec3('direction'),
        $.mat4('transform'),
      ]),
    ]);
    */
    app.boxProgram = utils.createGenericProgram(app.gl, {
      vert: shader.Vertex(options.state),
      frag: shader.Fragment(options.state),
      after: program => {
        const BIND_CAMERA = 0;
        const BIND_LIGHTS_VERT = 1;
        const BIND_LIGHTS_FRAG = 2;
        const INDX_CAMERA = app.gl.getUniformBlockIndex(program, 'Camera');
        const INDX_LIGHTS_VERT = app.gl.getUniformBlockIndex(program, 'LightsVert');
        const INDX_LIGHTS_FRAG = app.gl.getUniformBlockIndex(program, 'LightsFrag');
        app.gl.uniformBlockBinding(program, INDX_CAMERA, BIND_CAMERA);
        app.gl.uniformBlockBinding(program, INDX_LIGHTS_VERT, BIND_LIGHTS_VERT);
        app.gl.uniformBlockBinding(program, INDX_LIGHTS_FRAG, BIND_LIGHTS_FRAG);
        app.gl.bindBufferBase(app.gl.UNIFORM_BUFFER, BIND_CAMERA, app.UBOCamera.glBuffer);
        app.gl.bindBufferRange(app.gl.UNIFORM_BUFFER, BIND_LIGHTS_VERT, app.UBOLights.glBuffer, 0, 64);
        app.gl.bindBufferRange(app.gl.UNIFORM_BUFFER, BIND_LIGHTS_FRAG, app.UBOLights.glBuffer, 0, 384);
      }
    });
  }, [app, canvas, options]);

  useGUIChanges(app, canvas);

  useEffect(function RenderLoop() {
    const { gl } = app;
    let request = requestAnimationFrame(function frame() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      app.UBOCamera.upload(app.gl);
      app.UBOLights.upload(app.gl);
      app.boxProgram.use();
      app.boxMesh.bind();
      gl.frontFace(gl.CW);
      gl.drawElements(gl.TRIANGLES, app.boxMesh.count, gl.UNSIGNED_SHORT, 0);
      gl.frontFace(gl.CCW);
      // Queue next frame
      request = requestAnimationFrame(frame);
    });
    return () => window.cancelAnimationFrame(request);
  }, [app, options]);

  return <canvas ref={canvas} />;
};