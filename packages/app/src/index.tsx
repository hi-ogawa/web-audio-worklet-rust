import "./styles/index.ts";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { tinyassert } from "./utils/tinyassert";

function main() {
  const el = document.querySelector("#root");
  tinyassert(el);
  const root = createRoot(el);
  root.render(React.createElement(App));
}

main();
