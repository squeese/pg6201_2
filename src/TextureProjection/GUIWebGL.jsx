import React, { Fragment, useContext } from 'react';
import * as Options from './deps/Options';

const Mini = ({ children }) => <span style={{ fontSize: '0.6rem', color: '#568' }}>({children})</span>
const Reset = ({ values }) => {
  const { update } = useContext(Options.Context);
  return <Options.Button children="reset" onClick={() => update(proxy => (
    Object.keys(values).map(key => proxy[key].set(values[key]))
  ))} />;
};

export default () => (
  <Options.Container>
    <Options.Wrapper>
      <Options.Dictionary name="camera">
        <Options.Header>Camera</Options.Header>
        <Options.Label>
          FOV <Mini>min/max</Mini>
          <Reset values={{ fov: 90, offset: 5 }} />
        </Options.Label>
        <Options.Row>
          <Options.InputFloat name="fov" value={90} min={40} max={120} />
          <Options.InputFloat name="offset" value={5} />
        </Options.Row>
        <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0, 1]} />
      </Options.Dictionary>
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
        <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} />
        <Options.InputVector header="Diffuse" name="diffuse" value={[0.75, 0.75, 0.75]} min={0} max={1} />
        <Options.InputBool header="Depth Test" name="depthTest" value={true} />
      </Options.Dictionary>
      <Options.Dictionary name="monkey">
        <Options.Header>Monkey</Options.Header>
        <Options.InputVector header="Translation" name="translation" value={[0, 0, 0]} />
        <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
        <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
      </Options.Dictionary>
      <Options.Dictionary name="color">
        <Options.Header>Light Colors</Options.Header>
        <Options.InputVector header="Ambient Color" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Diffuse Color" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Specular Color" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
      </Options.Dictionary>
      <Options.List name="transforms" min={1} max={3}>
        {({ increment, decrement, list }) => (
          <Fragment>
            <Options.Header>
              <span>LightBuffer</span>
              <button onClick={increment}>+</button>
              <button onClick={decrement}>-</button>
            </Options.Header>
            {list.map(index => (
              <Options.Dictionary key={index} name={index}>
                <Options.ListDivider />
                <Options.InputVector header="Translation" name="translation" value={[0, 0, 0]} />
                <Options.InputVector header="Shear" name="shear" value={[0, 0, 0]} />
                <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
                <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
                <Options.InputInt header="order" name="wat" value={0} min={0} max={3} step={1} />
              </Options.Dictionary>
            ))}
          </Fragment>
        )}
      </Options.List>
    </Options.Wrapper>
  </Options.Container>
);