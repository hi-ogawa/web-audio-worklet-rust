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

![image](https://user-images.githubusercontent.com/4232207/210215422-c80aeb30-4d80-4970-89e4-aa04175e09a6.png)

## references

- https://github.com/emscripten-core/emscripten/pull/16449
- https://github.com/rustwasm/wasm-bindgen/issues/2367
- https://github.com/rustwasm/wasm-bindgen/pull/3017
- https://github.com/hi-ogawa/toy-metronome
- https://github.com/hi-ogawa/nih-plug-examples
- https://github.com/PolyMeilex/OxiSynth
