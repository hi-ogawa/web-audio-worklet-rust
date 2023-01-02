# WebAudio Worklet in Rust

simple example of integrating Rust into [`AudioWorkletProcessor`](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor)

```sh
pnpm i
pnpm build-wasm
pnpm dev
```

## todo

- [ ] can audioworklet run wasm-pack's web export format?
  - `TextEncoder is not defined`
- [ ] integrate oxisynth for cooler demo https://github.com/PolyMeilex/OxiSynth

## references

- https://github.com/emscripten-core/emscripten/pull/16449
- https://github.com/rustwasm/wasm-bindgen/issues/2367
- https://github.com/hi-ogawa/toy-metronome
- https://github.com/hi-ogawa/toy-metronome/issues/2
