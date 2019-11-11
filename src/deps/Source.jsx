import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/esm/styles/hljs';


export default ({ sources }) => {
  const [ open, setOpen ] = useState(false);
  const [ selected, setIndex ] = useState(0);
  const click = value => () => {
    if (!open) setOpen(true);
    else if (value === selected) setOpen(false);
    setIndex(value);
  };
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = e => (e.keyCode === 27) && close();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  return (
    <Container>
      <span>Shader sources</span>
      {sources.map(({ name }, index) => (
        <SelectButton key={index} onClick={click(index)} selected={open && index === selected}>
          {name}
        </SelectButton>
      ))}
      <Wrapper style={{ display: open ? 'block' : 'none' }}>
        <CloseButton onClick={close}>X</CloseButton>
        <SyntaxHighlighter language="glsl" style={tomorrowNight}>
          {sources[selected].source}
        </SyntaxHighlighter>
      </Wrapper>
    </Container>
  )
};

const Container = styled.div`
  position: fixed;
  top: 0px;
  right: 2px;
  max-height: 100vh;
  overflow: scroll;
  padding: 0;
  & > span {
    font-size: 0.6rem;
    color: white;
    padding: 4px;
  }
  text-align: right;
`;

const SelectButton = styled.button`
  background: ${({ selected }) => selected ? '#000' : '#012A'};
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

const Wrapper = styled.div`
  font-size: 0.8rem;
  position: relative;
  text-align: left;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  font-size: 2rem;
  background: #012A;
  color: white;
  outline: none;
  border: 0;
  margin: 0;
  padding: 4px;
  &:hover {
    background: #000;
  }
`;