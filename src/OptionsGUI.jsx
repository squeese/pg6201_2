import React from 'react';
import * as Options from './deps/Options';

export default () => (
  <Options.Container>
    <Options.Wrapper>
      <Options.Dictionary name="camera">
        <Options.Header>Camera</Options.Header>
        <Options.InputFloat header="Field of View" name="fov" value={90} min={40} max={120} />
      </Options.Dictionary>
      <Options.Dictionary name="light">
        <Options.Header>Light</Options.Header>
        <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} min={0} max={1} />
        <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
        <Options.InputVector header="Translation" name="translation" value={[0, 0, 0]} />
        <Options.InputVector header="Shear" name="shear" value={[0, 0, 0]} />
      </Options.Dictionary>
    </Options.Wrapper>
  </Options.Container>
);