import { useEffect, useRef, useContext, useCallback } from 'react';
import { vec3, quat, mat4 } from 'gl-matrix';
import { Context } from './Options';

export const rad = deg => deg * Math.PI / 180;
export const deg = rad => rad * 180 / Math.PI;
export const loop = (arr, fn) => arr.map((v, i) => fn(i, v)).join("");
export const fltstr = v => v % 1 === 0 ? `${v}.0` : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const copy = (out, arr) => {
  for (let i = 0; i < arr.length; i++) out[i] = arr[i];
  return out;
};

export const useFullscreenCanvas = (app, canvas, proxy) => {
  useEffect(function Initialize() {
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    app.gl = canvas.current.getContext('webgl2');
    app.gl.viewport(0, 0, window.innerWidth, window.innerHeight);
  }, [app, canvas]);
  useEffect(function ResizeEvent() {
    let timer;
    const onWindowResize = e => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        canvas.current.width = window.innerWidth;
        canvas.current.height = window.innerHeight;
        app.gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        const aspect = window.innerWidth / window.innerHeight;
        mat4.perspective(app.uCamera.projection(), rad(proxy.state.camera.fov), aspect, 0.1, 100);
      }, 250);
    } ;
    window.addEventListener("resize", onWindowResize, { passive: true });
    return () => window.removeEventListener("resize", onWindowResize);
  }, [app, canvas, proxy]);
};

export const useMouseCamera = (app, canvas) => {
  const { update, proxy } = useContext(Context);
  const ref = useRef({
    rotation: copy([], proxy.state.camera.rotation),
    offset: proxy.state.camera.offset,
    fov: proxy.state.camera.fov * Math.PI / 180,
    upwards: [],
  }).current;
  useEffect(() => {
    const node = canvas.current;
    const onMouseDownHandler = ({ clientX, clientY }) => {
      const change = quat.create();
      const roll = (window.innerWidth / 2 - clientX) / (window.innerWidth / 2);
      const pitch = 1 - Math.abs(roll);
      let dx = 0, dy = 0;
      const mouseMove = e => {
        if (dx === 0) window.requestAnimationFrame(() => {
          quat.fromEuler(change, dy / 4 * pitch, dx / 4, dy / 4 * roll);
          update(({ camera }) => quat.multiply(camera.rotation, camera.rotation.read(), change));
          dx = 0;
          dy = 0;
        });
        dx += clientX - e.clientX;
        dy += clientY - e.clientY;
        clientX = e.clientX;
        clientY = e.clientY;
      };
      node.addEventListener("mousemove", mouseMove);
      node.addEventListener("mouseup", function mouseUp() {
        node.removeEventListener("mousemove", mouseMove);
        node.removeEventListener("mouseup", mouseUp);
      });
    };
    let frame = null;
    let deltaScroll = 0;
    const onScrollWheelHandler = e => {
      deltaScroll += e.deltaY * 0.01;
      if (frame || Math.abs(deltaScroll) < 0.25) return;
      frame = window.requestAnimationFrame(() => {
        const amount = deltaScroll | 0;
        deltaScroll -= amount;
        update(({ camera }) => camera.offset.set(camera.offset.read() + amount * 0.1));
        frame = null;
      });
    };
    node.addEventListener("mousedown", onMouseDownHandler);
    node.addEventListener("wheel", onScrollWheelHandler, { passive: true });
    return () => {
      node.removeEventListener("mousedown", onMouseDownHandler);
      node.removeEventListener("wheel", onScrollWheelHandler);
    };
  }, [canvas, update]);

  return useCallback(dt => {
    ref.offset = lerp(ref.offset, proxy.state.camera.offset, 0.05 * dt);
    ref.fov = lerp(ref.fov, proxy.state.camera.fov * Math.PI / 180, 0.05 * dt);
    quat.slerp(ref.rotation, ref.rotation, proxy.state.camera.rotation, 0.05 * dt);
    vec3.transformQuat(app.uCamera.position(), [0, 0, ref.offset], ref.rotation);
    vec3.transformQuat(ref.upwards, [0, 1, 0], ref.rotation);
    mat4.lookAt(app.uCamera.view(), app.uCamera.position(), [0, 0, 0], ref.upwards);
    mat4.perspective(app.uCamera.projection(), ref.fov, window.innerWidth/window.innerHeight, 0.1, 100);
  }, [app, ref, proxy]);
};

export const loadShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = `Error compiling shader: ${gl.getShaderInfoLog(shader)}`;
    gl.deleteShader(shader);
    throw error;
  }
  return shader;
};

export const createProgram = (gl, vs, fs, link = true) => {
  const program = gl.createProgram();
  gl.attachShader(program, loadShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, loadShader(gl, gl.FRAGMENT_SHADER, fs));
  if (link) {
    if (typeof link === 'function') link(program);
    else linkProgram(gl, program);
  }
  return program;
};

export const linkProgram = (gl, program) => {
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`Unable to link shader`);
  return program;
};

export const createGenericProgram = (gl, { vert, frag, before, link, after }) => {
  const program = gl.createProgram();
  gl.attachShader(program, loadShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(program, loadShader(gl, gl.FRAGMENT_SHADER, frag));
  const ctx = {
    program,
    use: () => gl.useProgram(program),
    dispose: () => gl.deleteProgram(program),
  };
  if (before) before.call(ctx, program);
  if (link) link.call(ctx, program);
  else linkProgram(gl, program);
  if (after) {
    gl.useProgram(program);
    after.call(ctx, program);
    gl.useProgram(null);
  }
  return ctx;
};

export const createGenericMesh = (gl, { vertices, indices, normals }) => {
  const mesh = {
    vao: gl.createVertexArray(),
    vertexBuffer: gl.createBuffer(),
    normalBuffer: null,
    indexBuffer: gl.createBuffer(),
    count: indices.length,
    bind: () => gl.bindVertexArray(mesh.vao),
    dispose: () => {
      gl.deleteBuffer(mesh.vertexBuffer);
      if (mesh.normalBuffer)
        gl.deleteBuffer(mesh.normalBuffer);
      gl.deleteBuffer(mesh.indexBuffer);
      gl.deleteVertexArray(mesh.vao);
    },
  };
  gl.bindVertexArray(mesh.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices instanceof Float32Array ? vertices : new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  if (normals) {
    mesh.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals instanceof Float32Array ? normals : new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices instanceof Uint16Array ? indices : new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  return mesh;
};

export const useDeltaAnimationFrame = (fps, fn) => {
  const ref = useRef(fn);
  useEffect(() => {
    const hz = 1000 / fps;
    let active = true;
    window.requestAnimationFrame(prev => {
      window.requestAnimationFrame(function frame(time) {
        if (!active) return;
        const elapsed = time - prev;
        ref.current(elapsed / hz, elapsed, time);
        prev = time;
        window.requestAnimationFrame(frame);
      });
    });
    return () => {
      active = false;
    };
  }, [fps, ref]);
};

export const useFixedAnimationFrame = (fps, update, render) => {};


export const createFlatCubeMesh = (size = 1, CW = false) => ({
  vertices: new Float32Array([
    -size, size, size,
    -size, -size, size,
    size, -size, size,
    size, size, size,
    -size, -size, size,
    -size, -size, -size,
    size, -size, -size,
    size, -size, size,
    -size, -size, -size,
    -size, size, -size,
    size, size, -size,
    size, -size, -size,
    -size, size, -size,
    -size, size, size,
    size, size, size,
    size, size, -size,
    size, size, size,
    size, -size, size,
    size, -size, -size,
    size, size, -size,
    -size, size, -size,
    -size, -size, -size,
    -size, -size, size,
    -size, size, size,
  ]),
  normals: CW ? new Float32Array([
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0
  ]) : new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]),
  indices: new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ]),
});

export const UBO = (function UBOClosure() {
  const build = (offset, input, output) => {
    const size = input.reduce((cursor, fn) => fn(cursor, (offset, build) => {
      output.push(build);
      return offset;
    }), offset);
    return size + (16 - size % 16) % 16;
  };

  const NodeRootProxyHandlers = {
    get(root, key, proxy) {
      if (key === 'dispose') return gl => gl.deleteBuffer(root.___gpu);
      if (root.hasOwnProperty(key)) return root[key];
      return root.__children[key];
    },
  };

  const NodeTerminalProxyHandlers = {
    apply(terminal, _, args) {
      return terminal(terminal.__view, ...args);
    },
    get(terminal, key) {
      return terminal[key];
    },
  };

  const ArrayTerminal = (bytes, Type = Float32Array) => (name, value) => (cursor, next) => {
    const spaceInCurrentBlock = 16 - cursor % 16;
    const offset = cursor + (spaceInCurrentBlock < Math.min(16, bytes) ? spaceInCurrentBlock : 0);
    return next(offset + bytes, (node, buffer) => {
      const terminal = (view, value) => {
        if (value !== undefined && Array.isArray(value))
          copy(view, value);
        return view;
      };
      terminal.__offset = offset;
      terminal.__offsetEnd = offset + bytes;
      terminal.__bytes = bytes;
      terminal.__view = new Type(buffer, offset, bytes / Type.BYTES_PER_ELEMENT);
      terminal(terminal.__view, value);
      node[name] = new Proxy(terminal, NodeTerminalProxyHandlers);
    });
  };

  const ValueTerminal = (Type = Float32Array) => (name, value) => (cursor, next) => {
    const spaceInCurrentBlock = 16 - cursor % 16;
    const offset = cursor + (spaceInCurrentBlock < Math.min(16, 4) ? spaceInCurrentBlock : 0);
    return next(offset + 4, (node, buffer) => {
      const terminal = (view, value) => {
        if (value !== undefined && typeof value === 'number')
          view[0] = value;
        return view;
      };
      terminal.__offset = offset;
      terminal.__offsetEnd = offset + 4;
      terminal.__bytes = 4;
      terminal.__view = new Type(buffer, offset, 1);
      terminal(terminal.__view, value);
      node[name] = new Proxy(terminal, NodeTerminalProxyHandlers);
    });
  };

  return {
    float: ValueTerminal(Float32Array),
    uint: ValueTerminal(Uint32Array),
    int: ValueTerminal(Int32Array),
    vec2: ArrayTerminal(8),
    vec3: ArrayTerminal(12),
    vec4: ArrayTerminal(16),
    mat3: ArrayTerminal(48),
    mat4: ArrayTerminal(64),
    padOffsetAlignment: (alignment = 256) => (cursor, next) => {
      // gl.getParameter(gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT)
      return next(cursor + (alignment - cursor % alignment) % alignment, () => {});
    },
    array: (name, length, input) => (cursor, next) => {
      const output = [];
      const begin = cursor + (16 - cursor % 16) % 16;
      let offset = begin;
      if (Array.isArray(input)) {
        for (let i = 0; i < length; i++)
          offset = build(offset, input, output);
        return next(offset, (node, buffer) => {
          node[name] = new Proxy({
            __offset: begin,
            __offsetEnd: offset,
            __bytes: offset - begin,
            __children: Array.from(new Array(length)).map(() => ({})),
          }, NodeRootProxyHandlers);
          output.forEach((finalize, i) => finalize(node[name].__children[i / input.length | 0], buffer));
        });
      } else {
        for (let i = 0; i < length; i++)
          offset = build(offset, [input(i)], output);
        return next(offset, (node, buffer) => {
          node[name] = new Proxy({
            __offset: begin,
            __offsetEnd: offset,
            __bytes: offset - begin,
            __children: Array.from(new Array(length)),
          }, NodeRootProxyHandlers);
          output.forEach(finalize => finalize(node[name].__children, buffer));
        });
      }
    },
    create: (gl, ...input) => {
      const nodes = [];
      const bytes = build(0, input, nodes);
      const cpuBuffer = new ArrayBuffer(bytes);
      const gpuBuffer = gl.createBuffer();
      gl.bindBuffer(gl.UNIFORM_BUFFER, gpuBuffer);
      gl.bufferData(gl.UNIFORM_BUFFER, bytes, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
      return new Proxy(nodes.reduce((node, finalize) => {
        finalize(node.__children, cpuBuffer);
        return node;
      }, {
        __offset: 0,
        __offsetEnd: bytes,
        __bytes: bytes,
        __children: {},
        __cpu: cpuBuffer,
        __gpu: gpuBuffer,
      }), NodeRootProxyHandlers);
    },
  };
}());