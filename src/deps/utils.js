import { useEffect, useRef } from 'react';
import { Quaternion, Euler } from './three.module';
import { quat, mat4 } from 'gl-matrix';

export const lerp = (a, b, t) => a + (b - a) * t;
export const copy = (out, arr) => {
  for (let i = 0; i < arr.length; i++) out[i] = arr[i];
  return out;
};

export const mouseMoveHandlerThreeJS = (node, handler) => {
  const onMouseDownHandler = ({ clientX, clientY }) => {
    const change = new Quaternion();
    const euler = new Euler(0, 0, 0);
    const mouseMove = e => {
      const dx = clientX - e.clientX;
      const dy = clientY - e.clientY;
      clientX = e.clientX;
      clientY = e.clientY;
      euler.set(dy * 0.0, dx * 0.01, 0, 'XYZ');
      change.setFromEuler(euler);
      handler(change);
    }
    node.addEventListener("mousemove", mouseMove);
    node.addEventListener("mouseup", function mouseUp() {
      node.removeEventListener("mousemove", mouseMove);
      node.removeEventListener("mouseup", mouseUp);
    });
  };
  node.addEventListener("mousedown", onMouseDownHandler);
  return () => node.removeEventListener("mousedown", onMouseDownHandler);
};

export const mouseMoveHandlerGLMatrix = (node, handler) => {
  const onMouseDownHandler = ({ clientX, clientY }) => {
    const change = quat.create();
    const roll = (window.innerWidth / 2 - clientX) / (window.innerWidth / 2);
    const pitch = 1 - Math.abs(roll);
    let dx = 0;
    let dy = 0;
    const mouseMove = e => {
      if (dx === 0) {
        window.requestAnimationFrame(() => {
          handler(quat.fromEuler(change, dy / 4 * pitch, dx / 4, dy / 4 * roll), e);
          dx = 0;
          dy = 0;
        });
      }
      dx += clientX - e.clientX;
      dy += clientY - e.clientY;
      clientX = e.clientX;
      clientY = e.clientY;
    }
    node.addEventListener("mousemove", mouseMove);
    node.addEventListener("mouseup", function mouseUp() {
      node.removeEventListener("mousemove", mouseMove);
      node.removeEventListener("mouseup", mouseUp);
    });
  };
  node.addEventListener("mousedown", onMouseDownHandler);
  return () => node.removeEventListener("mousedown", onMouseDownHandler);
};

export const mouseWheelHandler = (node, handler) => {
  let deltaScroll = 0;
  let frame = null;
  const onScrollWheelHandler = e => {
    deltaScroll += e.deltaY * 0.01;
    if (frame || Math.abs(deltaScroll) < 0.25) return;
    frame = window.requestAnimationFrame(() => {
      const amount = deltaScroll | 0;
      deltaScroll -= amount;
      handler(amount)      
      frame = null;
    });
  };
  node.addEventListener("wheel", onScrollWheelHandler, { passive: true });
  return () => node.removeEventListener("wheel", onScrollWheelHandler);
};

export const windowResize = handler => {
  const onWindowResize = e => handler(window.innerWidth, window.innerHeight, e);
  window.addEventListener("resize", onWindowResize, { passive: true });
  return () => window.removeEventListener("resize", onWindowResize);
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
  if (before) before(program);
  if (link) link(program);
  else linkProgram(gl, program);
  if (after) {
    gl.useProgram(program);
    after(program);
    gl.useProgram(null);
  }
  return {
    program,
    use: () => gl.useProgram(program),
    dispose: () => gl.deleteProgram(program),
  };
};

export const createProgramUniformHelper = gl => {
  const handler = {
    get: (location, fn) => (...args) => gl[fn](location, ...args),
  };
  const wmap = new WeakMap();
  return (program, name) => {
    let map = wmap.get(program);
    if (!map) {
      wmap.set(program, new Map());
      map = wmap.get(program);
    }
    let proxy = map.get(name);
    if (!proxy) {
      const location = gl.getUniformLocation(program, name);
      map.set(name, new Proxy(location, handler));
      proxy = map.get(name);
    }
    return proxy;
  }
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

export const useCanvas = (app, canvas, options) => {
  useEffect(function Initialize() {
    canvas.current.width = window.innerWidth;
    canvas.current.height = window.innerHeight;
    app.gl = canvas.current.getContext('webgl2');
    app.gl.viewport(0, 0, window.innerWidth, window.innerHeight);
  }, [app, canvas]);

  useEffect(function ResizeEvent() {
    let timer;
    return windowResize((x, y) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        canvas.current.width = x;
        canvas.current.height = y;
        app.gl.viewport(0, 0, x, y);
        mat4.perspective(app.UBOCamera.projection, options.camera.fov.read() * Math.PI/180, x/y, 0.1, 100);
      }, 250);
    });
  }, [app, canvas, options]);
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
      console.log('oO');
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

export const createUniformBufferObject = (function Closure() {
  const primeDescriptors = (entries, offset, args) => {
    for (let i = 0; i < entries.length; i++)
      /* eslint-disable-next-line no-loop-func */
      entries[i] = entries[i](offset, 16 - offset % 16, args, (step, done) => {
        offset = step;
        return done;
      });
    return offset + (16 - offset % 16) % 16;
  };

  const UniformBufferObjectProxyBase = {
    rebuild(gl, lengths = {}) {
      if (this.glBuffer)
        this.dispose(gl);
      this.offsets = {};
      this.views = {};
      this.lengths = lengths;
      const row = this.description.slice(0);
      this.size = primeDescriptors(row, 0, lengths);
      this.arrayBuffer = new ArrayBuffer(this.size);
      this.glBuffer = gl.createBuffer();
      row.map(fn => fn(this.arrayBuffer, this.views, this.offsets));
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
      gl.bufferData(gl.UNIFORM_BUFFER, this.size, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    },
    upload(gl) {
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.arrayBuffer);
    },
    dispose(gl) {
      gl.deleteBuffer(this.glBuffer);
    }
  };

  const UniformBufferObjectProxyHandlers = {
    get: (obj, key) => obj[key] !== undefined ? obj[key] : obj.views[key],
  };

  const descriptionTerminal = bytes => name => (offset, space, _, chain) => {
    const begin = offset + (space < Math.min(16, bytes) ? space : 0);
    return chain(begin + bytes, (buffer, views, offsets) => {
      offsets[name] = begin;
      views[name] = new Float32Array(buffer, begin, bytes / 4);
    });
  };

  const uniformDescriptors = {
    float: descriptionTerminal(4),
    int: descriptionTerminal(4),
    bool: descriptionTerminal(4),
    vec2: descriptionTerminal(8),
    vec3: descriptionTerminal(12),
    vec4: descriptionTerminal(16),
    mat3: descriptionTerminal(48),
    mat4: descriptionTerminal(64),
    padUniformBufferOffsetAlignment: () => (offset, space, args, chain) => {
      const align = 256; // gl.getParameter(gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT);
      const bytes = (align - offset % align) % align;
      return chain(offset + bytes, () => {});
    },
    array: (name, _, entries) => (offset, space, args, chain) => {
      offset += space % 16;
      const count = args[name];
      const children = Array(count * entries.length).fill(0);
      for (let i = 0; i < count; i++) {
        const row = entries.slice(0);
        offset = primeDescriptors(row, offset, args);
        children.splice(i * entries.length, entries.length, ...row);
      }
      return chain(offset, (buffer, views, offsets) => {
        offsets[name] = Array.from(Array(count)).map(() => ({}));
        views[name] = Array.from(Array(count)).map(() => ({}));
        children.forEach((child, i) => {
          const index = i / entries.length | 0;
          child(buffer, views[name][index], offsets[name][index]);
        });
      });
    },
  };

  return function createUniformBufferObject(gl, descriptor) {
    const lengths = {};
    descriptor(new Proxy(() => {}, {
      get: (fn, key) => key !== 'array' ? fn : (name, count) => {
        lengths[name] = count;
      },
    }));
    const ubo = Object.create(UniformBufferObjectProxyBase);
    ubo.description = descriptor(uniformDescriptors);
    ubo.rebuild(gl, lengths);
    return new Proxy(ubo, UniformBufferObjectProxyHandlers);
  };
}());

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
        __cpu: cpuBuffer,
        __gpu: gpuBuffer,
        __children: {},
      }), NodeRootProxyHandlers);
    },
  };
}());