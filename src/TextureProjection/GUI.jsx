import React, { useContext, useEffect } from 'react';
import { mat4, quat, vec3 } from 'gl-matrix';
import * as Options from './../deps/Options';
import * as utils from './../deps/utils';
import { Vertex, Fragment } from './Shaders';

const CameraOptions = () => (
  <Options.Dictionary name="camera">
    <Options.Header>Camera</Options.Header>
    <Options.Label> FOV / Offset <Reset values={{ fov: 90, offset: 5 }} />
    </Options.Label>
    <Options.Row>
      <Options.InputFloat name="fov" value={90} min={40} max={120} />
      <Options.InputFloat name="offset" value={5} />
    </Options.Row>
    <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0, 1]} />
  </Options.Dictionary>
);

const PointLightOptions = () => (
  <List header="Point Lights" name="points" min={0} max={2}>
    <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
  </List>
);

const LightBoxOptions = () => (
  <List header="Box Lights" name="boxes" min={0} max={4}>
    <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
    <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
    <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
    <Options.InputVector header="Shear" name="shear" value={[0, 0, 0]} />
  </List>
);

export const useGUIChanges = (app, canvas) => {
  const { update, state:{ camera, points, boxes }, proxy } = useContext(Options.Context);
  const ref = React.useRef({
    rotation: utils.copy([], camera.rotation),
    offset: camera.offset,
    fov: camera.fov * Math.PI / 180,
    upwards: [],
  }).current;

  useEffect(() => utils.mouseMoveHandlerGLMatrix(canvas.current, delta => {
    update(({ camera }) => quat.multiply(camera.rotation, camera.rotation.read(), delta), 'mousemove');
  }), [canvas, update]);

  useEffect(() => utils.mouseWheelHandler(canvas.current, delta => {
    update(({ camera }) => camera.offset.set(camera.offset.read() + delta * 0.1));
  }), [canvas, update]);

  useEffect(function OptionsLightChange() {
    console.log('adf');
    if (app.UBOLights.lengths.points !== points.length || app.UBOLights.lengths.boxes !== boxes.length) {
      app.boxProgram = utils.createGenericProgram(app.gl, Vertex({ points, boxes }), Fragment({ points, boxes }));
      app.UBOLights.rebuild(app.gl, {
        points: points.length,
        boxes: boxes.length,
      });
    }
    points.forEach((point, index) => {
      utils.copy(app.UBOLights.points[index].ambient, point.ambient);
      utils.copy(app.UBOLights.points[index].diffuse, point.diffuse);
      utils.copy(app.UBOLights.points[index].specular, point.specular);
      utils.copy(app.UBOLights.points[index].position, point.position);
    });
    boxes.forEach((box, index) => {
      utils.copy(app.UBOLights.boxes[index].ambient, box.ambient);
      utils.copy(app.UBOLights.boxes[index].diffuse, box.diffuse);
      utils.copy(app.UBOLights.boxes[index].specular, box.specular);
      // utils.copy(app.UBOLights.boxes[index].direction, box.direction);
      // utils.copy(app.UBOLights.boxes[index].transform, box.transform);
    });
    app.UBOLights.upload(app.gl);
  }, [app, points, boxes]);

  utils.useDeltaAnimationFrame(60, dt => {
    ref.offset = utils.lerp(ref.offset, proxy.state.camera.offset, 0.05 * dt);
    ref.fov = utils.lerp(ref.fov, proxy.state.camera.fov * Math.PI / 180, 0.05 * dt);
    quat.slerp(ref.rotation, ref.rotation, proxy.state.camera.rotation, 0.05 * dt);
    vec3.transformQuat(app.UBOCamera.position, [0, 0, ref.offset], ref.rotation);
    vec3.transformQuat(ref.upwards, [0, 1, 0], ref.rotation);
    mat4.lookAt(app.UBOCamera.view, app.UBOCamera.position, [0, 0, 0], ref.upwards);
    mat4.perspective(app.UBOCamera.projection, ref.fov, window.innerWidth/window.innerHeight, 0.1, 100);
  }, [app, ref, proxy]);
};

export default () => (
  <Options.Container>
    <Options.Wrapper>
      <CameraOptions />
      <PointLightOptions />
      <LightBoxOptions />
    </Options.Wrapper>
  </Options.Container>
);

const List = ({ header, name, min, max, children }) => (
  <Options.List name={name} min={min} max={max}>
    {({ increment, decrement, list }) => (
      <React.Fragment>
        <Options.Header>
          <span>{header}</span>
          <Mini>{list.length}/{max}</Mini>
          <button onClick={increment}>+</button>
          <button onClick={decrement}>-</button>
        </Options.Header>
        {list.map(index => (
          <Options.Dictionary key={index} name={index}>
            <Options.ListDivider />
            {children}
          </Options.Dictionary>
        ))}
      </React.Fragment>
    )}
  </Options.List>
);

const Mini = ({ children }) => <span style={{ fontSize: '0.6rem', color: '#568' }}>({children})</span>
const Reset = ({ values }) => {
  const { update } = useContext(Options.Context);
  return <Options.Button children="reset" onClick={() => update(proxy => (
    Object.keys(values).map(key => proxy[key].set(values[key]))
  ))} />;
};