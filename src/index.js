import React from 'react';
import { render } from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as Options from './deps/Options';
import Presets, { SaveSession } from './deps/Presets';
import GUI from './GUI';
import App from './App';

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
  <Presets>
    <Options.Provider>
      <GlobalStyle />
      <GUI />
      <Options.Context.Consumer>
        {({ ready, state, proxy }) => ready && <App options={state} proxy={proxy} />}
      </Options.Context.Consumer>
      <SaveSession />
    </Options.Provider>
  </Presets>),
  document.getElementById('root'));
