import React, { useContext } from 'react';
import * as Options from './../deps/Options';

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

const ParticleOptions = () => (
  <Options.Dictionary name="particle">
    <Options.Header>Particles</Options.Header>
    <Options.InputInt header="Count" name="count" value={Math.pow(2, 17)} max={Math.pow(2, 22)} />
    <Options.Label>
      Duration <Mini>min/max</Mini>
      <Reset values={{ minDuration: 1, maxDuration: 2 }} />
    </Options.Label>
    <Options.Row>
      <Options.InputFloat name="minDuration" value={1} min={0} />
      <Options.InputFloat name="maxDuration" value={2} min={1} />
    </Options.Row>
    <Options.Label>
      Size <Mini>particle/room</Mini>
      <Reset values={{ size: 1, roomSize: 3 }} />
    </Options.Label>
    <Options.Row>
      <Options.InputFloat name="size" value={1} min={0.1} max={10} />
      <Options.InputFloat name="roomSize" value={3} min={1} />
    </Options.Row>
    <Options.Label>
      Alpha <Mini>lit/not-lit</Mini>
      <Reset values={{ insideAlpha: 0.5, outsideAlpha: 0.01 }} />
    </Options.Label>
    <Options.Row>
      <Options.InputFloat name="insideAlpha" value={0.5} min={0} max={1} step={0.01} />
      <Options.InputFloat name="outsideAlpha" value={0.01} min={0} max={1} step={0.01} />
    </Options.Row>
    <Options.InputFloat header="Speed" name="speed" value={0.01} />
  </Options.Dictionary>
);

const PointLightOptions = () => (
  <List header="Point Lights" name="points" min={1} max={2}>
    <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputFloat header="Highlight" name="highlight" value={32} min={0} step={0.5} />
    <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
  </List>
);

const LightBoxOptions = () => (
  <List header="Box Lights" name="boxes" min={1} max={4}>
    <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
    <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
    <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
    <Options.InputVector header="Shear" name="shear" value={[0, 0, 0]} />
  </List>
);

export default () => (
  <Options.Container>
    <Options.Wrapper>
      <CameraOptions />
      <ParticleOptions />
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