import React from 'react';
import * as Options from './deps/Options';

export default () => (
  <Options.Container>
    <Options.Wrapper>
      <Options.Dictionary name="camera">
        <Options.Header>Camera</Options.Header>
        <Options.InputFloat header="Field of View" name="fov" value={90} min={40} max={120} />
        <Options.InputFloat header="Offset" name="offset" value={5} />
        <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0, 1]} />
      </Options.Dictionary>
      <Options.Dictionary name="particle">
        <Options.Header>Particles</Options.Header>
        <Options.InputFloat header="Size" name="size" value={1} min={0.1} max={10} />
        <Options.InputFloat header="Min. Duration" name="minDuration" value={1} min={0} />
        <Options.InputFloat header="Max. Duration" name="maxDuration" value={2} min={1} />
        <Options.InputFloat header="Room Size" name="roomSize" value={3} min={1} />
        <Options.InputFloat header="Lit Alpha" name="insideAlpha" value={0.5} min={0} max={1} />
        <Options.InputFloat header="Nonlit Alpha" name="outsideAlpha" value={0.01} min={0} max={1} />
        <Options.InputFloat header="Count" name="count" value={Math.pow(2, 17)} max={Math.pow(2, 22)} />
        <Options.InputFloat header="Speed" name="speed" value={0.01} />
        <Options.InputBool header="Depth Test" name="depthTest" value={true} />
      </Options.Dictionary>
      <Options.Dictionary name="monkey">
        <Options.Header>Monkey</Options.Header>
      </Options.Dictionary>
      <Options.Dictionary name="light">
        <Options.Header>Light</Options.Header>
        <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
        <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
        <Options.InputVector header="Translation" name="translation" value={[0, 0, 0]} />
        <Options.InputVector header="Shear" name="shear" value={[0, 0, 0]} />
      </Options.Dictionary>
    </Options.Wrapper>
  </Options.Container>
);