import theme from "antd/lib/theme";
import alias from "antd/lib/theme/util/alias";
import type { Preset } from "unocss";

// cf. https://github.com/ant-design/ant-design/blob/555257113107821218899ffffa1acde11906f82e/components/theme/internal.tsx

// emit ant-design's light/dark theme variables,
// which then can be used e.g. via `bg-[var(--colorBgContainer)]`.
// see src/styles/antd-preset-dump.css for full list.

const { defaultAlgorithm, defaultSeed, darkAlgorithm } = theme;

const LIGHT = alias({ ...defaultAlgorithm(defaultSeed), override: {} });
const DARK = alias({ ...darkAlgorithm(defaultSeed), override: {} });

// dump css to review variables easily
//   pnpm -s ts -e 'console.log(require("./src/styles/antd-preset.ts").CSS)' > ./src/styles/antd-preset-dump.css
export const CSS = `
:root {
${Object.entries(LIGHT)
  .map(([k, v]) => `--${k}: ${v}`)
  .join(";\n")}
}
.dark {
${Object.entries(DARK)
  .map(([k, v]) => `--${k}: ${v}`)
  .join(";\n")}
}
`;

export function antdPreset(): Preset {
  return {
    name: "antd-preset",
    preflights: [{ getCSS: () => CSS }],
  };
}
