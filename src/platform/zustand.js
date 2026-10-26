import { useEffect, useState } from "react";

/**
 * Only as much of zustand as the app uses: a store hook with getState and
 * setState. Subscribers are called with (state, previousState), like zustand.
 */
export function create(initializer) {
  let state;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(partial, replace) {
    const next = typeof partial === "function" ? partial(state) : partial;
    if (next === null || next === undefined) return;
    const previous = state;
    const merged = replace ? next : Object.assign({}, previous, next);
    if (merged === previous) return;
    state = merged;
    listeners.forEach((listener) => listener(state, previous));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  state = initializer(setState, getState);

  function useStore(selector = (s) => s) {
    const [, force] = useState(0);
    const value = selector(state);
    useEffect(() => subscribe(() => force((n) => n + 1)), []);
    return value;
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  return useStore;
}
