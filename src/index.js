import React from 'react';
import { render } from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as Options from './deps/Options';
// import GUI from './GUIWebGL';
// import App from './AppThreeJS';
// import App from './AppWebGL';
import GUI from './TextureProjection/GUI';
import App from './TextureProjection/App';
// import App from './BufferTest/App';
// const GUI = () => null;

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
    <GUI />
    <Options.Context.Consumer>
      {({ ready, state, proxy }) => ready && <App options={state} proxy={proxy} />}
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
