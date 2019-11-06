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

let activeProgram = null;
export const createGenericProgram = (gl, { vertex, fragment, before, link, after }) => {
  const program = gl.createProgram();
  gl.attachShader(program, loadShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, loadShader(gl, gl.FRAGMENT_SHADER, fs));
  if (before) before(program);
  if (link) link(program);
  else linkProgram(gl, program);
  if (after) after(program);
  return {
    program,
    use: () => 
  }


  const fn = () => {
    if (activeProgram === program) return;
    activeProgram = program;
    gl.useProgram(program);
  };
  fn.dispose = () => gl.deleteProgram(program);
  fn.use = () => fn();
  fn.locations = new Map();
  const proxy = new Proxy(fn, {
    get: (_, method) => (name, ...args) => {
      let location = fn.locations.get(name);
      if (!location) {
        location = gl.getUniformLocation(program, name);
        fn.locations.set(name, location);
      }
      fn();
      gl[method](location, ...args);
      return proxy;
    },
  });
  return proxy;
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
  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);
  const fn = () => gl.bindVertexArray(vertexArray);
  fn.vertexArray = vertexArray;
  fn.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fn.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices instanceof Float32Array ? vertices : new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  if (normals) {
    fn.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fn.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals instanceof Float32Array ? normals : new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
  }
  fn.indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fn.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices instanceof Uint16Array ? indices : new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  fn.dispose = () => {
    gl.deleteBuffer(fn.vertexBuffer);
    if (fn.normalBuffer)
      gl.deleteBuffer(fn.normalBuffer);
    gl.deleteBuffer(fn.indexBuffer);
    gl.deleteVertexArray(fn.vertexArray);
  };
  fn.count = indices.length;
  return fn;
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


export const createFlatCubeMesh = (size = 1) => ({
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
  normals: new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
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
    upload(gl) {
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.arrayBuffer);
    },
    rebuild(gl, lengths = {}) {
      if (this.glBuffer)
        this.dispose(gl);
      this.views = {};
      this.lengths = lengths;
      const row = this.description.slice(0);
      this.size = primeDescriptors(row, 0, lengths);
      this.arrayBuffer = new ArrayBuffer(this.size);
      this.glBuffer = gl.createBuffer();
      row.map(fn => fn(this.arrayBuffer, this.views));
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.glBuffer);
      gl.bufferData(gl.UNIFORM_BUFFER, this.size, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, this.index, this.glBuffer);
    },
    dispose(gl) {
      gl.deleteBuffer(this.glBuffer);
    }
  };

  const UniformBufferObjectProxyHandlers = {
    get: (obj, key) => obj[key] || obj.views[key],
  };

  const descriptionTerminal = bytes => name => (offset, space, _, chain) => {
    const begin = offset + (space < Math.min(16, bytes) ? space : 0);
    return chain(begin + bytes, (buffer, views) => {
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
    array: (name, _, entries) => (offset, space, args, chain) => {
      offset += space % 16;
      const count = args[name];
      const children = Array(count * entries.length).fill(0);
      for (let i = 0; i < count; i++) {
        const row = entries.slice(0);
        offset = primeDescriptors(row, offset, args);
        children.splice(i * entries.length, entries.length, ...row);
      }
      return chain(offset, (buffer, views) => {
        views[name] = Array.from(Array(count)).map(() => ({}));
        children.forEach((child, i) => child(buffer, views[name][i / entries.length | 0]));
      });
    },
  };

  return function createUniformBufferObject(gl, index, descriptor) {
    const lengths = {};
    descriptor(new Proxy(() => {}, {
      get: (fn, key) => key !== 'array' ? fn : (name, count) => {
        lengths[name] = count;
      },
    }));
    const ubo = Object.create(UniformBufferObjectProxyBase);
    ubo.description = descriptor(uniformDescriptors);
    ubo.index = index;
    ubo.rebuild(gl, lengths);
    return new Proxy(ubo, UniformBufferObjectProxyHandlers);
  };
}());