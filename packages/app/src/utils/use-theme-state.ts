import React from "react";

// defined in <head> of index.html
declare function __getTheme(): string;
declare function __setTheme(theme: string): void;

export function useThemeState() {
  const [state, setState] = React.useState(__getTheme);

  function setStateWrapper(state: string) {
    setState(state);
    __setTheme(state);
  }

  return [state, setStateWrapper] as const;
}
