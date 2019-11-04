import React, { Fragment, createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';

export const Context = createContext({});
const { POSITIVE_INFINITY:MAX, NEGATIVE_INFINITY:MIN } = Number;
const floatFormat = v => (v * 100 | 0) / 100;
const noop = () => {};
const useDebounce = (delay = 0) => {
  const timeout = useRef(null);
  return cb => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      cb();
      timeout.current = null;
    }, delay);
  };
};

export const Provider = ({ children, preset = null }) => {
  const [ state, setState ] = useState({});
  const [ ready, setReady ] = useState(null);
  const debounce = useDebounce(0);
  const baseline = useRef(changeProxy({}));
  const proxy = useRef(changeProxy(preset || {}));
  const updater = useRef(dispatcher => {
    dispatcher(baseline.current);
    dispatcher(proxy.current);
  });
  useEffect(() => {
    setReady(true);
    setState(proxy.current());
    updater.current = dispatcher => {
      dispatcher(proxy.current);
      debounce(() => setState(proxy.current()));
    };
  }, [ debounce ]);
  useEffect(() => {
    proxy.current = changeProxy(preset || baseline.current());
    setState(proxy.current());
  }, [ preset ]);
  const update = useCallback(dispatcher => updater.current(dispatcher), [ updater ]);
  return (
    <Context.Provider
      value={{ ready, update, state, proxy: proxy.current }}
      children={children}
    />
  );
};

export const Event = ({ onReady = noop, onChange = noop }) => {
  const [ ready, setReady ] = useState(null);
  const { state, update } = useContext(Context);
  const prev = useRef(undefined);
  useEffect(() => {
    if (!ready && prev.current === undefined) return setReady(true);
    if (ready) {
      if (prev.current === undefined) onReady({ update, state });
      else if (prev.current !== state) onChange({ update, state }, prev.current);
      prev.current = state;
    }
  }, [ state, ready, prev, onReady, onChange, update ]);
  return null;
};

export const Float = ({ name, value, min = MIN, max = MAX, step = 0.1, children, ...props }) => {
  const [ pending, setPending ] = useState(null);
  const { state, update } = useContext(Context);
  const scroll = useRef(0);
  useEffect(() => {
    update(proxy => {
      if (proxy[name].read() === undefined)
        proxy[name].set(value);
    });
    return () => update(proxy => proxy[name].delete());
  }, [ update, name, value ]);
  const onChange = ({ target }) => {
    const numValue = Math.min(max, Math.max(min, parseFloat(target.value)));
    if (target.value !== "" && target.value === numValue.toString())  {
      setPending(null);
      update(proxy => proxy[name].set(numValue));
    } else setPending(target.value);
  };
  const onWheel = ({ deltaY, target }) => {
    if (pending !== null || target.disabled) return;
    if (scroll.current === 0) window.requestAnimationFrame(() => {
      update(proxy => proxy[name].set(Math.min(max, Math.max(min, proxy[name].read() - scroll.current * step))));
      scroll.current = 0;
    });
    scroll.current += deltaY * 0.1
  };
  const invalid = pending !== null;
  return children({
    value: invalid ? pending : floatFormat(state.hasOwnProperty(name) ? state[name] : value),
    invalid,
    onChange,
    onWheel,
    ...props,
  });
};

export const Bool = ({ name, value, children }) => {
  const { state, update } = useContext(Context);
  useEffect(() => {
    update(proxy => {
      if (proxy[name].read() === undefined)
        proxy[name].set(value);
    });
    return () => update(proxy => proxy[name].delete());
  }, [ update, name, value ]);
  const onChange = () => update(proxy => proxy[name].set(!proxy[name].read()));
  return children({
    checked: state.hasOwnProperty(name) ? state[name] : value,
    onChange,
  });
};

export const Dropdown = ({ name, value, children }) => {
  const { state, update } = useContext(Context);
  useEffect(() => {
    update(proxy => proxy[name].read() === undefined && proxy[name].set(value[0]));
    return () => update(proxy => proxy[name].delete());
  }, [ update, name, value ]);
  const onChange = ({ target }) => update(proxy => proxy[name].set(target.value));
  const current = state.hasOwnProperty(name) ? state[name] : value[0];
  return children({
    value: current,
    onChange,
    children: value.map((choice, index) => <option key={index} value={choice}>{choice}</option>)
  });
};

export const Dictionary = ({ name, children }) => {
  const { ready, state, update } = useContext(Context);
  const active = useRef(true);
  useEffect(() => {
    update(proxy => proxy[name].read() === undefined && proxy[name].set({}));
    return () => {
      active.current = false;
      update(proxy => proxy[name].delete());
    };
  }, [ update, name ]);
  const mmUpdate = useCallback(dispatcher => {
    if (!active.current) return;
    update((proxy, ...args) => {
      try {
        dispatcher(proxy[name]);
      } catch(e) {
        proxy[name].set({});
        dispatcher(proxy[name]);
      }
    });
  }, [ update, active, name ]);
  return (
    <Context.Provider
      value={{ ready, update: mmUpdate, state: state[name] || {}}}
      children={children}
    />
  );
};

export const List = ({ name, children, min = 0, max = 10 }) => {
  const [ list, setList ] = useState(Array.from(Array(min)).map((_, i) => i));
  const { ready, state, update } = useContext(Context);
  const active = useRef(true);
  useEffect(() => {
    update(proxy => {
      if (proxy[name] === undefined) proxy[name].set([]);
      else setList(proxy[name].read().map((_, i) => i));
    });
    return () => {
      active.current = false;
      update(proxy => proxy[name].delete());
    };
  }, [ update, active, name ]);
  useEffect(() => {
    if (state[name] && list.length < state[name].length)
      update(proxy => proxy[name].splice(-1));
  }, [ update, name, state, list ]);
  useEffect(() => {
    if (state[name] === undefined) return;
    if (list.length === state[name].length) return;
     setList(state[name].map((_, i) => i));
  }, [ state, list.length, name ]);
  const mmUpdate = useCallback(dispatcher => {
    if (!active.current) return;
    update(proxy => {
      try {
        dispatcher(proxy[name]);
      } catch(e) {
        if (proxy[name].read() === undefined) proxy[name].set([]);
        else setList(proxy[name].read().map((_, i) => i));
        dispatcher(proxy[name]);
      }
      if (list.length !== proxy[name].read().length)
        setList(proxy[name].read().map((_, i) => i));
    });
  }, [ update, active, name, list.length ]);
  const increment = () => (list.length < max) && setList([...list, list.length]);
  const decrement = () => (list.length > min) && setList(list.slice(0, -1));
  return (
    <Context.Provider
      value={{ ready, update: mmUpdate, state: state[name] || [] }}
      children={children({ increment, decrement, list })}
    />
  );
};

export const Vector = ({ name, value = [0, 0, 0], children, validate = noop, ...props }) => {
  const { ready, state, update } = useContext(Context);
  const active = useRef(true);
  useEffect(() => {
    update(proxy => proxy[name].read() === undefined && proxy[name].set(value));
    return () => {
      active.current = false;
      update(proxy => proxy[name].delete());
    };
  }, [ update, name, value ]);
  const mmUpdate = useCallback(dispatcher => {
    if (!active.current) return;
    update(proxy => {
      try {
        dispatcher(proxy[name]);
      } catch(e) {
        proxy[name].set(value);
        dispatcher(proxy[name]);
      }
      validate(proxy[name]);
    });
  }, [ update, name, active, validate, value ]);
  return (
    <Context.Provider value={{ ready, update: mmUpdate, state: state[name] || [] }}>
      {value.map(children)}
    </Context.Provider>
  );
};

export const Reset = ({ name, value }) => {
  const { update } = useContext(Context);
  return (
    <Button children="reset" onClick={() => update(proxy => proxy[name].set(value))} />
  );
};

export const InputFloat = ({ header = null, reset = true, name, value, ...props }) => (
  <Fragment>
    {header && <Label>{header}{!reset ? null : <Reset name={name} value={value} />}</Label>}
    <Float name={name} value={value} {...props}>
      {props => <Input {...props} />}
    </Float>
  </Fragment>
);

export const InputBool = ({ header = null, ...props }) => (
  <Fragment>
    {header && <Label>{header}</Label>}
    <Row>
      <Bool {...props}>
        {props => (
          <div style={{ background: '#0003', flex: '1 0 auto' }}>
            <input type="checkbox" {...props} />
          </div>
        )}
      </Bool>
    </Row>
  </Fragment>
);

export const InputDropdown = ({ header = null, ...props }) => (
  <Fragment>
    {header && <Label>{header}</Label>}
    <Row>
      <Dropdown {...props}>
        {props => <Select {...props} />}
      </Dropdown>
    </Row>
  </Fragment>
);

export const InputVector = ({ header = null, reset = true, name, value, validate, ...props }) => (
  <Fragment>
    {header && <Label>{header}{!reset ? null : <Reset name={name} value={value} />}</Label>}
    <Row>
      <Vector name={name} value={value} validate={validate}>
        {(value, index) => <InputFloat key={index} {...props} name={index} value={value} />}
      </Vector>
    </Row>
  </Fragment>
);

export const Json = () => {
  const { state } = useContext(Context);
  return <Pre>{JSON.stringify(state, null, 3)}</Pre>;
};

export const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 256px;
  background: #124D;
  overflow-y: scroll;
`;

export const Wrapper = styled.div`
  color: white;
  display: grid;
  grid-template-columns: 4fr 3fr; 
  padding: 0 1px 1px 0;
`;

export const Header = styled.h1`
  font-size: 0.7rem;
  font-weight: bold;
  color: #AAAA;
  grid-column: 1 / 3;
  margin: 0;
  padding: 0.25rem 0 0 0.45rem;
  display: flex;
  flex-direction: row;
  & > span {
    flex: 4 0 auto;
  }
  & > button {
    flex: 1 0 auto;
    border: 0;
    background: #012A;
    color: white;
    outline: none;
    &:hover {
      background: #000;
    }
  }
`;

export const Button = styled.button`
  background: #012A;
  color: white;
  outline: none;
    border: 0;
  &:hover {
    background: #000;
  }
`;

export const ListDivider = styled.div`
  height: 4px;
  background: #012A;
  grid-column: 1 / 3;
`;

export const Label = styled.h2`
  font-size: 0.65rem;
  font-weight: normal;
  padding: 0;
  margin: 0;
  padding-left: 0.5rem;
  background: #0004;
  & > button {
    float: right;
    color: #4576;
    font-size: 0.65rem;
    letter-spacing: -0.05rem;
    &:hover {
      color: white;
    }
  }
`;

export const Input = styled.input`
  border: 0;
  background: ${props => props.invalid ? 'red' : '#0003'};
  padding: 0.1rem 0.25rem;
  font-size: 0.6rem;
  border-left: 1px solid #1244;
  border-top: 1px solid #1244;
  box-shadow: 1px 1px 0px 0px #1244;
  color: ${props => props.disabled ? '#1244' : 'white'};
  opacity: ${props => props.disabled ? '1.0' : '1.0'};
`;

export const Select = styled.select`
  border: 0;
  font-size: 0.6rem;
  border-left: 1px solid #1244;
  border-top: 1px solid #1244;
  box-shadow: 1px 1px 0px 0px #1244;
  flex: 1 0 auto;
`;

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  ${props => props.right ? 'justify-content: flex-end' : ''};
  & > input {
    min-width: 0;
    width: 0;
    flex: 1 0 auto;
  }
`;

export const Grid = styled.div`
  display: grid;
`;

export const Pre = styled.pre`
  color: white;
  padding: 0.5rem;
  grid-column: 1 / 3;
`;

export const changeProxy = (function () {
  function type(val) {
    return Object.prototype.toString.call(val).slice(8, -1);
  }
  type.ARRAY = 'Array';
  type.FUNCTION = 'Function';
  type.OBJECT = 'Object';
  type.MAP = 'Map';
  type.NUMBER = 'Number';
  type.STRING = 'String';
  const read = (fn, key) => fn.state ? fn.state[key] : fn(read)[key];
  const prime = (fn, key) => {
    fn.node = fn.state ? fn.state : fn(prime);
    return fn.node[key];
  };
  const swap = (o, key, value) => {
    if (type(o) === type.OBJECT) {
      if (value === undefined) {
        const { [key]: _, ...rest } = o;
        return rest;
      } else return { ...o, [key]: value };
    }
    if (type(o) === type.ARRAY) {
      const arr = [...o];
      if (value !== undefined) arr[key] = value;
      return arr;
    }
    return (value === undefined) ? {} : { [key]: value };
  };
  const update = (fn, key, val) => {
    if (fn.state) {
      fn.state = swap(fn.node, key, val);
      return;
    }
    return fn(update, swap(fn.node, key, val));
  };
  const set = (fn, value) => {
    const current = fn(prime);
    value = typeof value === 'function' ? value(current) : value;
    if (value !== current) {
      fn(update, value);
      return true;
    }
    return false;
  };
  const push = (fn, args) => {
    if (args.length === 0) return false;
    fn(update, fn(prime).concat(args));
    return true;
  };
  const splice = (fn, args) => {
    if (args.length === 0) return false;
    let arr = fn(prime).slice(0);
    arr.splice(...args);
    fn(update, arr);
    return true;
  };
  const leafHandlers = {
    apply: target => target(read),
    set(target, key, value, p) {
      p[key].set(value);
      return true;
    },
    get(target, key) {
      switch (key) {
        case "read": return () => target(read);
        case "set": return value => set(target, value);
        case "push": return (...args) => push(target, args);
        case "splice": return (...args) => splice(target, args);
        case "delete": return () => set(target, undefined);
        default: return getLeafProxy(target, key);
      }
    },
    deleteProperty(target, key) {
      getLeafProxy(target, key).delete();
      return true;
    }
  };
  const getLeafProxy = (target, key) => {
    if (!target.proxies[key]) {
      const fn = (action, val) => action(target, key, val);
      fn.proxies = {};
      target.proxies[key] = new Proxy(fn, leafHandlers);
    }
    return target.proxies[key];
  };
  const rootHandlers = {
    apply: target => target.state,
    set: (target, key, value) => {
      getLeafProxy(target, key).set(value);
      return true;
    },
    get: (target, key) => key === 'state' ? target.state : getLeafProxy(target, key, true),
    deleteProperty: (target, key) => {
      getLeafProxy(target, key).delete();
      return true;
    }
  };
  return state => {
    const fn = () => { };
    fn.state = state;
    fn.proxies = {};
    return new Proxy(fn, rootHandlers);
  };
})();