import { Quaternion, Euler } from './three.module';
import { quat } from 'gl-matrix';

export const lerp = (a, b, t) => a + (b - a) * t;

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
    const mouseMove = e => {
      const dx = clientX - e.clientX;
      const dy = clientY - e.clientY;
      clientX = e.clientX;
      clientY = e.clientY;
      handler(quat.fromEuler(change, dy / 4 * pitch, dx / 4, dy / 4 * roll), e);
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

export const createProgram = (gl, vs, fs) => {
  const program = gl.createProgram();
  gl.attachShader(program, loadShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, loadShader(gl, gl.FRAGMENT_SHADER, fs));
  return program;
};

export const linkProgram = (gl, program) => {
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`Unable to link shader`);
  return program;
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
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices instanceof Float32Array ? vertices : new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
  let normalBuffer = null;
  if (normals) {
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals instanceof Float32Array ? normals : new Float32Array(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
  }
  const indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices instanceof Uint16Array ? indices : new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  return {
    vertexArray,
    normalBuffer,
    indexBuffer,
    length: indices.length,
    cleanup: () => {
      gl.deleteBuffer(vertexBuffer);
      if (normalBuffer)
        gl.deleteBuffer(normalBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteVertexArray(vertexArray);
    },
  };
};
