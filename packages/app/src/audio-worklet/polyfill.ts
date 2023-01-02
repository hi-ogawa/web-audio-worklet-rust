// https://github.com/rustwasm/wasm-bindgen/issues/2367
// https://github.com/anonyco/FastestSmallestTextEncoderDecoder

// @ts-expect-error (no typing)
import fastestsmallesttextencoderdecoder from "fastestsmallesttextencoderdecoder";
Object.assign(globalThis, fastestsmallesttextencoderdecoder);
