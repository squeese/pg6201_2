import React, { useState, useEffect } from 'react';

export default ({ options, proxy }) => {
  const [ state, setState ] = useState([]);
  const [ page, setPage ] = useState(-1);

  useEffect(() => {
    setState(state => [...state, JSON.stringify(options, null, 2)]);
    setPage(page => page + 1);
  }, [options]);

  return (
    <div style={{ overflow: 'scroll', position: 'fixed', top: 0, left: '256px', right: 0, bottom: 0, fontSize: '0.6rem' }}>
      <div>
        {state.map((_, index) => (
          <button key={index} onClick={() => setPage(index)}>
            {index === page ? `[ ${index} ]` : index}
          </button>
        ))}
      </div>
      <pre>{state[page]}</pre>
    </div>
  );
};