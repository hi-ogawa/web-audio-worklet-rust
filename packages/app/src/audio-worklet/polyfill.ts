// https://github.com/rustwasm/wasm-bindgen/issues/2367
// https://github.com/anonyco/FastestSmallestTextEncoderDecoder

// @ts-expect-error
import TextEncoderAndDecoder from "fastestsmallesttextencoderdecoder";
Object.assign(globalThis, TextEncoderAndDecoder);
