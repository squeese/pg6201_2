import React, { useState } from 'react';
import styled from 'styled-components';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/esm/styles/hljs';


export default ({ sources }) => {
  const [ open, setOpen ] = useState(false);
  const [ index, setIndex ] = useState(0);
  const click = value => () => {
    if (!open) setOpen(true);
    else if (value === index) setOpen(false);
    setIndex(value);
  };
  return (
    <Container>
      {sources.map(({ name }, index) => (
        <button key={index} onClick={click(index)}>{name}</button>
      ))}
      <Wrapper style={{ display: open ? 'block' : 'none' }}>
    <SyntaxHighlighter language="glsl" style={tomorrowNight}>
        {sources[index].source}
    </SyntaxHighlighter>
      </Wrapper>
    </Container>
  )
};

const Container = styled.div`
  position: fixed;
  top: 0px;
  left: 264px;
  right: 8px;
  max-height: 100vh;
  overflow: scroll;
  padding: 0;
  & > button {
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
  }
`;

const Wrapper = styled.div`
  font-size: 0.8rem;
`;