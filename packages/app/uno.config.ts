import {
  defineConfig,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";
import { antdPreset } from "./src/styles/antd-preset";

// based on https://github.com/hi-ogawa/youtube-dl-web-v2/blob/ca7c08ca6b144c235bdc4c7e307a0468052aa6fa/packages/app/uno.config.ts

export default defineConfig({
  presets: [
    antdPreset(),
    presetUno(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
      },
    }),
  ],
  shortcuts: {
    spinner: `
      animate-spin
      rounded-full
      border-2 border-gray-500 border-t-gray-300 border-l-gray-300
    `,
    btn: `
      cursor-pointer
      transition
      disabled:(cursor-not-allowed opacity-50)
    `,
    "btn-ghost": `
      not-disabled:hover:(text-[var(--colorPrimaryHover)])
      not-disabled:active:(text-[var(--colorPrimaryActive)])
    `,
    "btn-primary": `
      text-white
      bg-[var(--colorPrimary)]
      not-disabled:hover:bg-[var(--colorPrimaryHover)]
      not-disabled:active:bg-[var(--colorPrimaryActive)]
    `,
  },
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
