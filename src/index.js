import React from 'react';
import { render } from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as Options from './deps/Options';
import OptionsGUI from './OptionsGUI';
// import ThreeJSApp from './ThreeJSApp';
import ThreeJSApp from './Test';

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

const preset = window.sessionStorage.getItem("preset");
let timeout;
render((
  <Options.Provider preset={preset && JSON.parse(preset)}>
    <GlobalStyle />
    <OptionsGUI />
    <Options.Context.Consumer>
      {({ ready }) => ready && <ThreeJSApp />}
    </Options.Context.Consumer>
    <Options.Context.Consumer>
      {({ ready, state }) => {
        if (ready) {
          clearTimeout(timeout);
          timeout = setTimeout(() => window.sessionStorage.setItem("preset", JSON.stringify(state)), 250);
        }
        return null;
      }}
    </Options.Context.Consumer>
    <button style={{ position: 'absolute', top: 0, right: 0}} children="reset" onClick={() => {
      window.sessionStorage.removeItem("preset");
      setTimeout(() => window.location.reload(), 0);
    }} />
  </Options.Provider>),
  document.getElementById('root'));
