import React from 'react';
import * as Options from './deps/Options';

export default () => (
  <Options.Container>
    <Options.Wrapper>
      <CameraOptions />
      <ParticleOptions />
      <ObjectOptions />
      <LightOptions />
    </Options.Wrapper>
  </Options.Container>
);

const CameraOptions = () => (
  <Options.Section header="Camera" name="camera">
    <Options.ResetRow label="FOV / Offset">
      <Options.InputFloat name="fov" value={90} min={40} max={120} />
      <Options.InputFloat name="offset" value={5} />
    </Options.ResetRow>
    <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0, 1]} />
  </Options.Section>
);

const ParticleOptions = () => (
  <Options.Section header="Particles" name="particle">
    <Options.InputInt header="Count" name="count" value={Math.pow(2, 17)} max={Math.pow(2, 22)} />
    <Options.ResetRow label="Duration" misc="min/max">
      <Options.InputFloat name="minDuration" value={1} min={0} />
      <Options.InputFloat name="maxDuration" value={2} min={1} />
    </Options.ResetRow>
    <Options.ResetRow label="Size" misc="particle/room">
      <Options.InputFloat name="size" value={1} min={0.1} max={10} />
      <Options.InputFloat name="roomSize" value={3} min={1} />
    </Options.ResetRow>
    <Options.ResetRow label="Alpha" misc="lit/not">
      <Options.InputFloat name="insideAlpha" value={0.5} min={0} max={1} step={0.01} />
      <Options.InputFloat name="outsideAlpha" value={0.01} min={0} max={1} step={0.01} />
    </Options.ResetRow>
    <Options.InputFloat header="Speed" name="speed" value={0.01} />
  </Options.Section>
);

const ObjectOptions = () => (
  <Options.InputList header="Objects" name="objects" min={1} max={10}>
    <Options.InputDropdown header="Texture" name="mesh" value={['cube', 'suzanne']} />
    <Options.InputDropdown header="Texture" name="texture" value={['none', 'houseInterior']} />
    <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
    <Options.InputFloat header="Highlight" name="highlight" value={32} min={0.1} step={0.25} />
    <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
    <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
    <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
  </Options.InputList>
);

const LightOptions = () => (
  <Options.InputList header="Lights" name="lights" min={0} max={10}>
    <Options.InputType>
      <Options.InputTypeItem name="box">
        <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
        <Options.InputVector header="Rotation" name="rotation" value={[0, 0, 0]} />
        <Options.InputVector header="Scale" name="scale" value={[1, 1, 1]} />
        <Options.InputVector header="Shear" name="shear" value={[0, 0, 0]} />
      </Options.InputTypeItem>
      <Options.InputTypeItem name="direction">
        <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputFloat header="Highlight" name="highlight" value={32} min={0} step={0.5} />
        <Options.InputVector header="Direction" name="direction" value={[0.0, 1.0, 0.0]} step={0.1} />
      </Options.InputTypeItem>
      <Options.InputTypeItem name="point">
        <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputFloat header="Highlight" name="highlight" value={32} min={0} step={0.5} />
        <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
      </Options.InputTypeItem>
      <Options.InputTypeItem name="spot">
        <Options.InputVector header="Ambient" name="ambient" value={[0.05, 0.05, 0.05]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Diffuse" name="diffuse" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputVector header="Specular" name="specular" value={[0.7, 0.7, 0.7]} min={0} max={1} step={0.01} />
        <Options.InputFloat header="Highlight" name="highlight" value={32} min={0} step={0.5} />
        <Options.InputVector header="Position" name="position" value={[0.0, 1.0, 0.0]} step={0.1} />
        <Options.InputVector header="Direction" name="direction" value={[0.0, 1.0, 0.0]} step={0.1} />
      </Options.InputTypeItem>
    </Options.InputType>
  </Options.InputList>
);