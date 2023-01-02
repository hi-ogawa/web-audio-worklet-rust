# WebAudio Worklet with Rust

simple example of integrating Rust into [`AudioWorkletProcessor`](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor)

```sh
# development
pnpm i
pnpm build-wasm
pnpm dev

# release
pnpm build
pnpm release-production
```

## references

- https://github.com/emscripten-core/emscripten/pull/16449
- https://github.com/rustwasm/wasm-bindgen/issues/2367
- https://github.com/rustwasm/wasm-bindgen/pull/3017
- https://github.com/hi-ogawa/toy-metronome
- https://github.com/hi-ogawa/nih-plug-examples
