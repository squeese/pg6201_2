import React, { useRef, useEffect } from 'react';
import { mat4, vec3 } from 'gl-matrix';
import * as utils from './../deps/utils';
import * as twgl from 'twgl.js';

const Vertex = `#version 300 es
  uniform CameraVert {
    vec3 color;
    mat4 projection;
    mat4 view;
    vec3 position;
  } uCamera;
  layout(location=0) in vec4 aPosition;
  void main() {
    gl_Position = uCamera.projection * uCamera.view * aPosition;
  }
`;

const Fragment = `#version 300 es
  precision mediump float;
  uniform CameraFrag {
    vec3 color;
  } uCamera;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(uCamera.color, 1.0);
  }
`;

const BIND = {
  CAMERA_VERT: 0,
  CAMERA_FRAG: 1,
};

export default ({ options }) => {
  const canvas = useRef();
  const app = useRef({}).current;
  utils.useCanvas(app, canvas, options);

  useEffect(function Initialize() {
    app.gl.clearColor(0.3, 0.4, 0.6, 1.0);
    app.gl.enable(app.gl.CULL_FACE);
    app.gl.blendFunc(app.gl.SRC_ALPHA, app.gl.ONE);
    app.mesh = utils.createGenericMesh(app.gl, utils.createFlatCubeMesh(1));
    app.program = utils.createGenericProgram(app.gl, {
      vert: Vertex,
      frag: Fragment,
      after: program => {
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'CameraVert'), BIND.CAMERA_VERT);
        app.gl.uniformBlockBinding(program, app.gl.getUniformBlockIndex(program, 'CameraFrag'), BIND.CAMERA_FRAG);
      }
    });

    app.UBOCamera = utils.createUniformBufferObject(app.gl, $ => [
      $.vec3('color1'),
      $.mat4('projection'),
      $.mat4('view'),
      $.vec3('position'),
      $.padUniformBufferOffsetAlignment(),
      $.vec3('color2'),
    ]);

    const pinfo = twgl.createProgramInfo(app.gl, [Vertex, Fragment]);
    console.log(pinfo);

    console.log(app.UBOCamera.size);
    console.log(app.UBOCamera.offsets);

    mat4.perspective(app.UBOCamera.projection, 65*Math.PI/180, window.innerWidth/window.innerHeight, 0.1, 100);
    mat4.lookAt(app.UBOCamera.view, [3, 2, 4], [0, 0, 0], [0, 1, 0]);
    vec3.copy(app.UBOCamera.color1, [1, 0, 0]);
    vec3.copy(app.UBOCamera.color2, [0, 1, 0]);

    // create buffer -> uniform_buffer ?
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.UBOCamera.glBuffer);
    app.gl.bufferData(app.gl.UNIFORM_BUFFER, app.UBOCamera.size, app.gl.DYNAMIC_DRAW);
    // app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, null);

    const indices = [
      app.gl.getUniformBlockIndex(app.program.program, 'CameraVert'),
      app.gl.getUniformBlockIndex(app.program.program, 'CameraFrag'),
    ];
    // const indices = app.gl.getUniformIndices(app.program.program, ['CameraVert', 'CameraFrag']);
    // const name = app.gl.UNIFORM_TYPE; // Returns an Array of GLenum indicating the types of the uniforms.
    // const name = app.gl.UNIFORM_SIZE; //  Returns an Array of GLuint indicating the sizes of the uniforms.
    // const name = app.gl.UNIFORM_BLOCK_INDEX; // Returns an Array of GLint indicating the block indices of the uniforms.
    const name = app.gl.UNIFORM_OFFSET; //  Returns an Array of GLint indicating the uniform buffer offsets.
    // const name = app.gl.UNIFORM_ARRAY_STRIDE; //  Returns an Array of GLint indicating the strides between the elements.
    // const name = app.gl.UNIFORM_MATRIX_STRIDE; //  Returns an Array of GLint indicating the strides between columns of a column-major matrix or a row-major matrix.
    // const name = app.gl.UNIFORM_IS_ROW_MAJOR; //  Returns an Array of GLboolean indicating whether each of the uniforms is a row-major matrix or not.
    console.log(indices, app.gl.getActiveUniforms(app.program.program, indices, name));

    const OFFSET = app.gl.getParameter(app.gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT);
    const SIZE = app.gl.getParameter(app.gl.UNIFORM_BLOCK_SIZE_DATA);
    console.log(OFFSET, SIZE);

    app.gl.bindBufferRange(app.gl.UNIFORM_BUFFER, BIND.CAMERA_VERT, app.UBOCamera.glBuffer, 0, 160);
    app.gl.bindBufferRange(app.gl.UNIFORM_BUFFER, BIND.CAMERA_FRAG, app.UBOCamera.glBuffer, 256, 16);

    // upload data
    app.gl.bindBuffer(app.gl.UNIFORM_BUFFER, app.UBOCamera.glBuffer);
    app.gl.bufferSubData(app.gl.UNIFORM_BUFFER, 0, app.UBOCamera.arrayBuffer);


  }, [app, canvas, options]);

  useEffect(function RenderLoop() {
    const { gl } = app;
    let request = requestAnimationFrame(function frame() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      app.program.use();
      app.mesh.bind();
      gl.frontFace(gl.CW);
      gl.drawElements(gl.TRIANGLES, app.mesh.count, gl.UNSIGNED_SHORT, 0);
      gl.frontFace(gl.CCW);
      gl.enable(gl.BLEND);
      gl.disable(gl.BLEND);
      // request = requestAnimationFrame(frame);
    });
    return () => window.cancelAnimationFrame(request);
  }, [app, options]);

  return <canvas ref={canvas} />;
};