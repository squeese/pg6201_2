import React from 'react';
import { render } from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import * as Options from './deps/Options';
import Presets from './deps/Presets';
import GUI from './GUI';
import App from './App';
// import App from './Test';

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

const SaveButton = () => {
  const { state } = React.useContext(Options.Context);
  const ref = React.useRef();
  const save = () => {
    const input = ref.current;
    input.value = JSON.stringify(state);
    input.select();
    document.execCommand('copy');
    window.sessionStorage.setItem("preset", JSON.stringify(state));
  };
  return (
    <div style={{ position: 'fixed', bottom: 32, right: 0 }}>
      <input ref={ref} />
      <button onClick={save}>save</button>
    </div>
  );
};

render((
  <Presets>
    <Options.Provider>
      <GlobalStyle />
      <GUI />
      <Options.Context.Consumer>
        {({ ready, state, proxy }) => ready && <App options={state} proxy={proxy} />}
      </Options.Context.Consumer>
      <SaveButton />
    </Options.Provider>
  </Presets>),
  document.getElementById('root'));
