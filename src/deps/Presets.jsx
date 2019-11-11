import React, { Fragment, cloneElement, useRef, useState } from 'react';
import { createBrowserHistory } from 'history';
import styled from 'styled-components';

const PRESETS = {
  suzannewindow: {
    json: require('./presets/suzanne_window.json'),
    button: 'Suzanne in Window',
    description: `Scene contains four LightBoxes and one PointLight, and there is also applied shear transform on all the LightBoxes`,
  },
  suzannespotlight: {
    json: require('./presets/suzanne_spotlight.json'),
    button: 'Suzanne in Spotlight',
    description: 'Scene contains one spotlight shining down on suzanne',
  },
  suzannepointlight: {
    json: require('./presets/suzanne_points.json'),
    button: 'Suzanne in Pointlight',
    description: 'Scene contains one two PointLights and a LightBox shining down on suzanne',
  },
  empty: {
    json: null,
    button: 'Empty Scene',
    description: null,
  },
};

const list = Object.keys(PRESETS).map(key => {
  PRESETS[key].key = key;
  return { key, button: PRESETS[key].button };
});

const loadConfig = location => {
  const key = location.search.slice(1);
  if (key === 'memory')
    return JSON.parse(window.sessionStorage.getItem("preset"));
  return PRESETS.hasOwnProperty(key) ? PRESETS[key] : PRESETS.suzannewindow;
};

export default ({ children }) => {
  const history = useRef(createBrowserHistory());
  const [preset, setPreset] = useState(loadConfig(history.current.location));
  const onClick = key => () => {
    if (key) history.current.push(`?${key}`);
    else history.current.push("");
    setPreset(loadConfig(history.current.location));
  };

  return (
    <Fragment>
      <Container>
        <Wrapper>
          <span>Presets</span>
          {list.map(({ key, button }) => (
            <SelectButton key={key} onClick={onClick(key)} selected={preset.key === key}>{button}</SelectButton>
          ))}
          <Description>{preset.description}</Description>
        </Wrapper>
      </Container>
      {cloneElement(children, { preset: preset.json })}
    </Fragment>
  );
};

const Container = styled.div`
  position: fixed;
  top: 20px;
  right: 2px;
 `;

 const Wrapper = styled.div`
  position: relative;
  text-align: right;
  & > span {
    font-size: 0.6rem;
    color: white;
    padding: 4px;
  }
 `;

 const Description = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  color: white;
  font-size: 0.8rem;
  padding: 1rem;
  text-align: center;
 `;

const SelectButton = styled.button`
  background: ${({ selected }) => selected ? '#000' : '#012A'};
  font-weight: ${({ selected }) => selected ? 'bold' : 'normal'};
  color: white;
  outline: none;
  border: 0;
  margin: 0;
  padding: 4px;
  font-size: 0.6rem;
  &:hover {
    background: #000;
  }
  & + & {
    border-left: 1px solid #012F;
  }
`;