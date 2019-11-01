import React from 'react';
import { render } from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as Options from './deps/Options';
import OptionsGUI from './OptionsGUI';
import ThreeJSApp from './ThreeJSApp';


const GlobalStyle = createGlobalStyle`
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
      "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
  }
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  canvas {
    width: 100%;
    height: 100%;
  }
`;

render((
  <Options.Provider>
    <GlobalStyle />
    <OptionsGUI />
    <Options.Context.Consumer>
      {({ ready }) => ready && <ThreeJSApp />}
    </Options.Context.Consumer>
  </Options.Provider>),
  document.getElementById('root'));
