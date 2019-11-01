import { quat, vec3 } from 'gl-matrix';

export const lerp = (a, b, t) => a + (b - a) * t;

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
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`Unable to initialize shader`);
  return program;
};

export const linkProgram = (gl, program) => {
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`Unable to link shader`);
  return program;
};

export const createPlaneMesh = (size = 1) => ({
  vertices: new Float32Array([
    -size, -size, 0,
    size, -size, 0,
    -size, size, 0,
    size, size, 0, 
  ]),
  normals: new Float32Array([
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
  ]),
  indices: new Uint16Array([
    0, 1, 2,
    1, 3, 2,
  ]),
});

export const createSimpleCubeMesh = (size = 1) => ({
  vertices: new Float32Array([
    -size, -size, size,
    size, -size, size,
    -size, size, size,
    size, size, size,
    -size, size, -size,
    size, size, -size,
    -size, -size, -size,
    size, -size, -size,
  ]),
  normals: new Float32Array([
    -0.5773502691896258, -0.5773502691896258, 0.5773502691896258,
    0.5773502691896258, -0.5773502691896258, 0.5773502691896258,
    -0.5773502691896258, 0.5773502691896258, 0.5773502691896258,
    0.5773502691896258, 0.5773502691896258, 0.5773502691896258,
    -0.5773502691896258, 0.5773502691896258, -0.5773502691896258,
    0.5773502691896258, 0.5773502691896258, -0.5773502691896258,
    -0.5773502691896258, -0.5773502691896258, -0.5773502691896258,
    0.5773502691896258, -0.5773502691896258, -0.5773502691896258,
  ]),
  indices: new Uint16Array([
    0, 1, 2, 1, 3, 2, // front
    2, 3, 4, 3, 5, 4,
    2, 4, 6, 2, 6, 0,
    0, 6, 1, 1, 6, 7,
    1, 7, 3, 3, 7, 5,
    7, 6, 5, 6, 4, 5,
  ]),
});

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

export const flattenMesh = (function() {
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const cross = (a, b) => a.map((_, i) => a[(i+1)%3] * b[(i+2)%3] - a[(i+2)%3] * b[(i+1)%3]);
  const normalize = a => {
    const m = Math.hypot(...a);
    return a.map(v => v / m);
  };
  return ({ vertices, indices }) => {
    const _vertices = [];
    const _normals = [];
    const _indices = [];
    for (let i = 0; i < indices.length; i+=3) {
      const a = indices[i] * 3;
      const b = indices[i+1] * 3;
      const c = indices[i+2] * 3;
      const pa = vertices.slice(a, a + 3);
      const pb = vertices.slice(b, b + 3);
      const pc = vertices.slice(c, c + 3);
      const ba = sub(pa, pb);
      const bc = sub(pc, pb);
      const n = normalize(cross(bc, ba));
      _indices.push(_vertices.length / 3, _vertices.length / 3 + 1, _vertices.length / 3 + 2);
      _vertices.push(...pa, ...pb, ...pc);
      _normals.push(...n, ...n, ...n);
    }
    return {
      vertices: _vertices,
      normals: _normals,
      indices: _indices,
    };
  };
}());

export const createSpring = (k = 0.04, f = 0.875, fps = 1000/60) => {
  let v = 0;
  let c = null;
  return (e, x) => {
    const dk = e / fps * k;
    c = c || x;
    v = (v + (x - c) * dk) * f;
    c = c + v;
    return c;
  };
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

export const loadImage = url => new Promise((resolve, reject) => {
  const image = document.createElement("img");
  image.crossOrigin = "";
  image.src = `/${url}`;
  image.addEventListener("load", function cb() {
    image.removeEventListener("load", cb);
    resolve(image);
  });
});

export const loadSkyboxTexture = (gl, texture, urls) => Promise.all(urls.map(loadImage)).then(images => {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[5]);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
});

export const copy = (a, b) => {
  for (let i = 0; i < b.length; i++) a[i] = b[i];
  return a;
};

export const createMouseMoveHandler = handler => {
  const onMouseDownHandler = e => {
    if (e.target.nodeName !== "CANVAS") return;
    let { clientX, clientY } = e;
    const roll = (window.innerWidth / 2 - e.clientX) / (window.innerWidth / 2);
    const pitch = 1 - Math.abs(roll);
    const change = quat.identity([0, 0, 0, 1]);
    const mouseMove = e => {
      const dx = clientX - e.clientX;
      const dy = clientY - e.clientY;
      clientX = e.clientX;
      clientY = e.clientY;
      handler(quat.fromEuler(change, dy / 4 * pitch, dx / 4, dy / 4 * roll));
    }
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", function mouseUp() {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    });
  };
  window.addEventListener("mousedown", onMouseDownHandler);
};

export const createMouseWheelHandler = handler => {
  let deltaScroll = 0;
  let frame = null;
  const onScrollWheelHandler = e => {
    if (e.target.nodeName !== "CANVAS") return;
    deltaScroll += e.deltaY * 0.01;
    if (frame || Math.abs(deltaScroll) < 0.25) return;
    frame = window.requestAnimationFrame(() => {
      const amount = deltaScroll | 0;
      deltaScroll -= amount;
      handler(amount)      
      frame = null;
    });
  };
  window.addEventListener("wheel", onScrollWheelHandler);
};

export const createUniformBuffer = (gl, index, ...views) => {
  let totalSize = 0;
  for (let i = 1; i < views.length; i += 3) {
    const bytes = views[i];
    const space = 4 - (totalSize % 16) / 4;
    if (space !== 4 && bytes > space)
      totalSize += space * 4;
    totalSize += bytes * 4;
  }
  totalSize += (4 - (totalSize % 16) / 4) * 4;
  const arrayBuffer = new ArrayBuffer(totalSize);
  arrayBuffer.glBuffer = gl.createBuffer();
  arrayBuffer.index = index;
  let currentOffset = 0;
  for (let i = 0; i < views.length; i += 3) {
    const [ key, bytes, value ] = views.slice(i);
    const space = 4 - (currentOffset % 16) / 4;
    if (space !== 4 && bytes > space)
      currentOffset += space * 4;
    arrayBuffer[key] = new Float32Array(arrayBuffer, currentOffset, bytes);
    if (value !== null) {
      copy(arrayBuffer[key], value);
    }
    currentOffset += bytes * 4;
  }
  gl.bindBuffer(gl.UNIFORM_BUFFER, arrayBuffer.glBuffer);
  gl.bufferData(gl.UNIFORM_BUFFER, totalSize, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, index, arrayBuffer.glBuffer);
  arrayBuffer.update = () => {
    gl.bindBuffer(gl.UNIFORM_BUFFER, arrayBuffer.glBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, arrayBuffer);
  };
  arrayBuffer.cleanup = () => gl.deleteBuffer(arrayBuffer.glBuffer);
  return arrayBuffer;
};

export const zip = (size, arr) => {
  const result = [];
  for (let i = 0; i < arr[0].length; i += size)
    for (let j = 0; j < arr.length; j++)
      result.push(...arr[j].slice(i, i + size));
  return result;
}

// hmm..
export const resetRoll = (out, rotation) => {
  const R = [];
  const U = vec3.transformQuat([], [0, 1, 0], rotation);
  const F = vec3.transformQuat([], [0, 0, -1], rotation);
  vec3.normalize(R, vec3.cross(R, F, [0, 1, 0]));
  vec3.normalize(U, vec3.cross(U, R, F));
  quat.invert(out, rotation);
  vec3.transformQuat(R, R, out);
  vec3.transformQuat(U, U, out);
  vec3.transformQuat(F, F, out);
  quat.setAxes(out, F, R, U);
  quat.invert(out, out);
  quat.multiply(out, rotation, out);
  return out;
};

export const resetPitch = (out, rotation) => {
  const R = vec3.transformQuat([], [1, 0, 0], rotation);
  const U = [];
  const F = vec3.transformQuat([], [0, 0, -1], rotation);
  vec3.normalize(U, vec3.cross(U, R, [0, 0, -1]));
  vec3.normalize(F, vec3.cross(F, U, R));
  quat.invert(out, rotation);
  vec3.transformQuat(R, R, out);
  vec3.transformQuat(U, U, out);
  vec3.transformQuat(F, F, out);
  quat.setAxes(out, F, R, U);
  quat.invert(out, out);
  quat.multiply(out, rotation, out);
  return out;
};

export const resetYaw = (out, rotation) => {
  const R = vec3.transformQuat([], [1, 0, 0], rotation);
  const U = vec3.transformQuat([], [0, 1, 0], rotation);
  const F = [];
  vec3.normalize(F, vec3.cross(F, U, [1, 0, 0]));
  vec3.normalize(R, vec3.cross(R, F, U));
  quat.invert(out, rotation);
  vec3.transformQuat(R, R, out);
  vec3.transformQuat(U, U, out);
  vec3.transformQuat(F, F, out);
  quat.setAxes(out, F, R, U);
  quat.invert(out, out);
  quat.multiply(out, rotation, out);
  return out;
};
