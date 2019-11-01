import React, { useContext, useRef, useEffect } from 'react';
import { Context } from './deps/Options';
import * as T from './deps/three.module';

export default () => {
  const canvas = useRef();
  const app = useRef({}).current;
  const { state:{ camera }} = useContext(Context);

  // Initialize the ThreeJS stuff
  useEffect(() => {
    // THREE.Camera
    app.camera = new T.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
    app.camera.position.set(1, -1.5, 3.5);
    app.camera.lookAt(0, -1.75, 0);
    // THREE.WebGLRenderer
    app.gl = canvas.current.getContext('webgl2');
    app.renderer = new T.WebGLRenderer({
      canvas: canvas.current,
      context: app.gl,
      antialias: true,
    });
    app.renderer.setClearColor(0x112244, 1);
    app.renderer.setSize(window.innerWidth, window.innerHeight);
    // Mesh: Room
    app.room = new T.Mesh(
      new T.BoxGeometry(10, 10, 10),
      new T.MeshStandardMaterial({
        color: 0xffffff,
        side: T.BackSide,
      }));
    // Light: Tmp-pointlight
    const sphere = new T.SphereBufferGeometry(0.25, 16, 8);
    app.light = new T.PointLight(0xff0040, 2, 50);
    app.light.position.x = 3;
    app.light.position.y = -3;
    app.light.position.z = -3;
    app.light.add(new T.Mesh(sphere, new T.MeshBasicMaterial({ color: 0xff0040 })));
    // THREE.Scene
    app.scene = new T.Scene();
    app.scene.add(app.room);
    app.scene.add(app.light);
  }, [canvas, app]);

  // Options.camera changes
  useEffect(() => {
    app.camera.fov = camera.fov;
    app.camera.updateProjectionMatrix();
  }, [app, camera]);

  // Start/Stop the render loop
  useEffect(() => {
    let active = true;
    requestAnimationFrame(function frame() {
      if (!active) return;
      app.renderer.render(app.scene, app.camera);
      requestAnimationFrame(frame);
    });
    return () => {
      active = false;
    };
  }, [app]);

  return <canvas ref={canvas} />;
};

/*
const initialize = (canvas, { camera }) => {
};

function PG6201_40(canvas, { camera }) {}

PG6201_40.prototype = {
  options({ camera }) {
    this.camera.fov = camera.fov;
    this.camera.updateProjectionMatrix();
  },
  update() {
    this.light.position.x = Math.sin(performance.now() * 0.001) * 4;
    this.light.position.y = -4;
    this.light.position.z = Math.cos(performance.now() * 0.001) * 4;
  },
  render() {
  },
};
*/



/*


    const controls = new OrbitControls(camera, renderer.domElement);

    const dots = (function createDots() {
      const gl = renderer.getContext();
      const material = new T.ShaderMaterial({
        vertexShader: document.getElementById("ParticleVertexShader").textContent.trim(),
        fragmentShader: document.getElementById("ParticleFragmentShader").textContent.trim(),
        blending: T.NormalBlending,
        uniforms: {
          uTest: { value: new T.Matrix4() },
        },
        onBeforeLink: program => {
          gl.transformFeedbackVaryings(program, ["vPosition", "vVelocity", "vDuration"], gl.SEPARATE_ATTRIBS);
        },
      });
      const geometry = new T.BufferGeometry({});
      const f = 32;
      const num = f * f * f;
      const position = new Float32Array(Array.from(Array(num * 3)).map(() => (Math.random() * 2 - 1) * 5.0));

      const w = 5;
      const m = new T.Matrix4();
      // m.makePerspective(-1, 1, 1, -1, 1, 10.0);
      let i = 0;
      for (let z = 0; z < f; z++) {
        for (let y = 0; y < f; y++) {
          for (let x = 0; x < f; x++) {
            const xx = -w + (2 * w) * (x / (f - 1));
            const yy = -w + (2 * w) * (y / (f - 1));
            const zz = -w + (2 * w) * (z / (f - 1));
            const vv = new T.Vector3(xx, yy, zz);
            vv.applyMatrix4(m);
            position[i+0] = vv.x;
            position[i+1] = vv.y;
            position[i+2] = vv.z;
            i += 3;
          }
        }
      }
      // const v = new T.Vector3(-2, 2, 10);
      // console.log('v', v);
      // const g = v.applyMatrix4(m);
      // console.log('g', g);

      const velocity = new Float32Array(Array.from(Array(num * 3)).map(() => 0.0));
      const duration = new Float32Array(Array.from(Array(num)).map(() => 0.0));
      geometry.setAttribute('position', new T.BufferAttribute(position, 3).setUsage(gl.STREAM_COPY));
      geometry.setAttribute('velocity', new T.BufferAttribute(velocity, 3).setUsage(gl.STREAM_COPY));
      geometry.setAttribute('duration', new T.BufferAttribute(duration, 1).setUsage(gl.STREAM_COPY));


      let next, index = 0;
      const transforms = [];
      const mesh = new T.Points(geometry, material);
      mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
        if (!material.program) return;
        transforms.push({
          feedback: gl.createTransformFeedback(),
          position: renderer.attributes.get(geometry.attributes.position).buffer,
          velocity: renderer.attributes.get(geometry.attributes.velocity).buffer,
          duration: renderer.attributes.get(geometry.attributes.duration).buffer,
        });
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transforms[0].feedback);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, transforms[0].position);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, transforms[0].velocity);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, transforms[0].duration);
        transforms.push({
          feedback: gl.createTransformFeedback(),
          position: gl.createBuffer(),
          velocity: gl.createBuffer(),
          duration: gl.createBuffer(),
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, transforms[1].position);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.attributes.position.array, gl.STREAM_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, transforms[1].velocity);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.attributes.velocity.array, gl.STREAM_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, transforms[1].duration);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.attributes.duration.array, gl.STREAM_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transforms[1].feedback);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, transforms[1].position);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, transforms[1].velocity);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, transforms[1].duration);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        mesh.onBeforeRender = onBeforeRender;
        mesh.onAfterRender = onAfterRender;
        onBeforeRender(renderer, scene, camera, geometry, material);
      };

      function onBeforeRender(renderer, scene, camera, geometry, material) {
        // console.log(...m.elements);
        // m.makePerspective(-1, 1, 1, -1, 0.01, 1.0);
        // console.log(...m.elements);
        const n = 0.5;
        material.uniforms.uTest.value = material.uniforms.uTest.value.makePerspective(-n, n, n, -n, 1.4, 10.0);
        renderer.attributes.get(geometry.attributes.position).buffer = transforms[index].position;
        renderer.attributes.get(geometry.attributes.velocity).buffer = transforms[index].velocity;
        renderer.attributes.get(geometry.attributes.duration).buffer = transforms[index].duration;
        next = (index + 1) % 2;
        renderer.state.useProgram(material.program.program);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transforms[next].feedback);
        gl.beginTransformFeedback(gl.POINTS);
      };

      function onAfterRender(renderer, scene, camera, geometry, material) {
        gl.endTransformFeedback();
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
        index = next;
      };

      scene.add(mesh);
      return mesh;
    }());

    const cube = (function box() {
      const geometry = new T.BoxGeometry(4, 4, 4);
      const texture = new T.TextureLoader().load('crate.jpg');
      const material = new T.MeshBasicMaterial({ map: texture, wireframe: true });
      const cube = new T.Mesh(geometry, material);
      scene.add(cube);
      return cube;
    }());

    camera.position.z = 10;
    dots.rotation.x = cube.rotation.x = 0.2;
    dots.rotation.y = cube.rotation.y = 0.5;
    dots.rotation.z = cube.rotation.z = 0;

    */