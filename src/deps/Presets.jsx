import React, { Fragment, cloneElement, useRef, useState } from 'react';
import { createBrowserHistory } from 'history';
import styled from 'styled-components';

const presets = {
  preset1: require('./presets/preset1.json'),
  preset2: require('./presets/preset2.json'),
};

const loadConfig = location => {
  const name = location.search.slice(1);
  return presets.hasOwnProperty(name) ? presets[name] : null;
};

export default ({ children }) => {
  const history = useRef(createBrowserHistory());
  const [preset, setPreset] = useState(loadConfig(history.current.location));
  const setConfig = name => () => {
    if (name) history.current.push(`?${name}`);
    else history.current.push("");
    setPreset(loadConfig(history.current.location));
  };
  return (
    <Fragment>
      <Container>
        <span>Presets</span>
        <SelectButton onClick={setConfig(null)}>Empty</SelectButton>
        <SelectButton onClick={setConfig('preset1')}>Room with four beams</SelectButton>
        <SelectButton onClick={setConfig('preset2')}>preset2</SelectButton>
      </Container>
      {cloneElement(children, { preset })}
    </Fragment>
  );
};

const Container = styled.div`
    position: fixed;
    top: 20px;
    right: 2px;
    & > span {
      font-size: 0.6rem;
      color: white;
      padding: 4px;
    }
    text-align: right;
 `;

const SelectButton = styled.button`
  background: #012A;
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