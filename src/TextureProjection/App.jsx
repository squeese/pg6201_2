import React, { useRef, useEffect } from 'react';
import * as utils from './../deps/utils';
import { Vertex, Fragment } from './Shaders';
import { useGUIChanges } from './GUI';

export default ({ options }) => {
  const canvas = useRef();
  const app = useRef({}).current;
  utils.useCanvas(app, canvas, options);

  useEffect(function Initialize() {
    app.gl.clearColor(0.3, 0.4, 0.6, 1.0);
    app.gl.enable(app.gl.CULL_FACE);
    app.gl.enable(app.gl.BLEND);
    app.gl.blendFunc(app.gl.SRC_ALPHA, app.gl.ONE);
    app.boxMesh = utils.createGenericMesh(app.gl, utils.createFlatCubeMesh(3));
    app.boxProgram = utils.createGenericProgram(app.gl, {
      vert: Vertex(options.state),
      frag: Fragment(options.state),
      after: program => {
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Camera'), 0);
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'Lights'), 1);
      }
    });
    app.UBOCamera = utils.createUniformBufferObject(app.gl, 0, $ => [
      $.mat4('projection'),
      $.mat4('view'),
      $.vec3('position'),
    ]);
    app.UBOLights = utils.createUniformBufferObject(app.gl, 1, $ => [
      $.vec4('test'),
      $.vec4('color'),
      $.array('points', options.state.points.length, [
        $.vec3('ambient'),
        $.vec3('diffuse'),
        $.vec3('specular'),
        $.vec3('position'),
      ]),
      $.array('boxes', options.state.boxes.length, [
        $.vec3('ambient'),
        $.vec3('diffuse'),
        $.vec3('specular'),
        $.vec3('direction'),
        $.mat4('transform'),
      ]),
    ]);
    console.log(app.UBOLights.offsets.color, app.UBOLights.glBuffer, app.UBOLights.size, app.UBOCamera.size);
    utils.copy(app.UBOLights.test, [1, 0, 0]);
    utils.copy(app.UBOLights.color, [0, 1, 0]);

    app.UBOLights.upload(app.gl);
    // app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.UBOLights.glBuffer);
    // const indices = app.gl.getUniformIndices(app.boxProgram.program, ['Camera', 'Lights']);
    const indices = app.gl.getUniformIndices(app.boxProgram.program, ['Camera', 'Lights']);
    const offsets = app.gl.getActiveUniforms(app.boxProgram.program, [0, 1], app.gl.UNIFORM_OFFSET);
    const size = app.gl.getActiveUniformBlockParameter(app.boxProgram.program, 1, app.gl.UNIFORM_BLOCK_DATA_SIZE);
    console.log(indices, offsets, size);
    app.gl.bindBufferRange(app.gl.UNIFORM_BUFFER, 1, app.UBOLights.glBuffer, 0, 16);
    /*
    app.UBOLightsVertex = utils.createUniformBufferObject(app.gl, 2, $ => [
      $.array('points', options.state.points.length, [
        $.vec3('position'),
      ]),
    ]);
    app.UBOLightsFragment = utils.createUniformBufferObject(app.gl, 3, $ => [
      $.array('points', options.state.points.length, [
        $.vec3('ambient'),
        $.vec3('diffuse'),
        $.vec3('specular'),
      ]),
      $.array('boxes', options.state.boxes.length, [
        $.vec3('ambient'),
        $.vec3('diffuse'),
        $.vec3('specular'),
        $.vec3('direction'),
        $.mat4('transform'),
      ]),
    ]);
    */
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