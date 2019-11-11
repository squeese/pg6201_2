import React, { useMemo, useState, useEffect, useRef, useContext, useCallback } from 'react';
import { vec3, quat, mat4 } from 'gl-matrix';
import { Context } from './Options';

export const rad = deg => deg * Math.PI / 180;
export const deg = rad => rad * 180 / Math.PI;
export const loop = (arr, fn) => arr.map((v, i) => fn(i, v)).join("").trim();
export const lerp = (a, b, t) => a + (b - a) * t;
export const copy = (out, arr, offset = 0) => {
  for (let i = 0; i < arr.length; i++) out[i + offset] = arr[i];
  return out;
};

/* eslint-disable-next-line no-extend-native */
Number.prototype.floatString = function(v, b) {
  return this % 1 === 0 ? `${this}.0` : this;
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
          if (proxy.state.camera.roll) {
            quat.fromEuler(change, dy / 4 * pitch, dx / 4, dy / 4 * roll);
          } else {
            quat.fromEuler(change, dy / 4, dx / 4, 0);
          }
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
  }, [canvas, update, proxy]);

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

/* eslint-disable react-hooks/exhaustive-deps */
export const useUpdatePrograms = (options, cb) => {
  const previous = useRef();
  useEffect(() => {
    if (!previous.current) cb(true);
    else if (previous.current.options.length !== options.length) cb(false);
    else {
      for (let i = 0; i < options.length; i++) {
        if (options[i].type !== previous.current.options[i].type) {
          cb(false);
          break;
        }
      }
    }
    previous.current = { options };
  }, [options]);
};
/* eslint-enable react-hooks/exhaustive-deps */

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

export const createGenericProgram = (gl, { vert, frag, before, link, after }) => ({
  program: null,
  use() {
    if (this.program === null) {
      this.program = gl.createProgram();
      gl.attachShader(this.program, loadShader(gl, gl.VERTEX_SHADER, vert()));
      gl.attachShader(this.program, loadShader(gl, gl.FRAGMENT_SHADER, frag()));
      if (before) before.call(this, this.program);
      if (link) link.call(this, this.program);
      else linkProgram(gl, this.program);
      if (after) {
        gl.useProgram(this.program);
        after.call(this, this.program);
        return;
      }
    }
    gl.useProgram(this.program)
  },
  dispose() {
    gl.deleteProgram(this.program);
    this.program = null;
  },
});

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

export const useFps = cb => {
  const ref = useRef(cb);
  return useMemo(() => {
    let previous;
    let count = 0;
    let timer = 1000;
    return () => {
      const current = performance.now();
      if (previous) {
        timer -= current - previous;
        if (timer <= 0) {
          ref.current(count);
          count = 0;
          timer = 1000;
        } else count++;
      }
      previous = current;
    };
  }, [ref]);
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
        if (ref.current(elapsed / hz, elapsed, time) !== false) {
          prev = time;
          window.requestAnimationFrame(frame);
        }
      });
    });
    return () => {
      active = false;
    };
  }, [fps, ref]);
};

export const useSpring = (target, config = {}) => {
  const ref = useRef();
  ref.current = ref.current || new Spring(target, config);
  ref.current.set(target);
  return ref.current;
};

export function Spring(target, config) {
  this.target = target || 0;
  this.current = config.hasOwnProperty('current') ? config.current : (target || 0);
  this.velocity = config.velocity || 0;
  this.stiffness = config.stiffness || 0.04;
  this.damping = config.damping || 0.875;
  this.precision = config.precision || 0.001;
}

Spring.prototype = {
  set(target) {
    this.target = target;
  },
  step(elapsed) {
    // elapsed...
    this.velocity = (this.velocity + (this.target - this.current) * this.stiffness) * this.damping;
    this.current += this.velocity;
    return this.current;
  },
  idle() {
    if (Math.abs(this.velocity) < this.precision && Math.abs(this.current - this.target) < this.precision) {
      this.current = this.target;
      this.velocity = 0;
      return true;
    }
    return false;
  }
};

export const AnimateSpring = ({ springs, onIdle, children }) => {
  const keys = Object.keys(springs);
  const init = keys.reduce((obj, key) => ({...obj, [key]: springs[key].current}), {});
  return <RequestAnimationFrameDelegate
    springs={springs}
    keys={keys}
    init={init}
    onIdle={onIdle}
    children={children}
  />;
};

const RequestAnimationFrameDelegate = ({ keys, init, springs, children, onIdle }) => {
  const [ state, setState ] = useState(init);
  const request = useRef();
  const timestamp = useRef(null);
  window.cancelAnimationFrame(request.current);
  if (keys.length) request.current = window.requestAnimationFrame(function step(ts) {
    const next = {...state};
    for (let i = keys.length - 1; i >= 0; i--) {
      next[keys[i]] = springs[keys[i]].step(timestamp.current && (ts - timestamp.current));
      if (springs[keys[i]].idle()) {
        next[keys[i]] = springs[keys[i]].target;
        keys.pop();
      }
    }
    setState(next);
    timestamp.current = keys.length ? ts : null;
  });
  else if (onIdle) onIdle();
  return children(state);
};



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
      // if (length === 0) return next(cursor, () => {});
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
          for (let i = 0; i < length; i++) {
            let min = Number.POSITIVE_INFINITY;
            let max = Number.NEGATIVE_INFINITY;
            Object.keys(node[name].__children[i]).forEach(key => {
              if (node[name].__children[i][key].__offset < min) min = node[name].__children[i][key].__offset;
              if (node[name].__children[i][key].__offsetEnd > max) max = node[name].__children[i][key].__offsetEnd;
            });
            node[name].__children[i].__offset = min;
            node[name].__children[i].__offsetEnd = max;
            node[name].__children[i].__bytes = max - min;
            // node[name].__children[i].__view = new Float32Array()
          }
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