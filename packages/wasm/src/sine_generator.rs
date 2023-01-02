use std::f32::consts::TAU;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct SineGenerator {
    sample_rate: f32,
    phase: f32,
}

#[wasm_bindgen]
impl SineGenerator {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            phase: 0.0,
            sample_rate,
        }
    }

    // TODO: how to pass multiple ports/channels efficiently (probably it has to be pre-determined)
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
    // https://rustwasm.github.io/docs/wasm-bindgen/reference/types/number-slices.html
    pub fn process(&mut self, out_samples: &mut [f32], frequency: f32, gain: f32) -> bool {
        for sample in out_samples {
            *sample = gain * next_sine(&mut self.phase, frequency / self.sample_rate);
        }
        true
    }
}

fn next_sine(phase: &mut f32, delta: f32) -> f32 {
    let value = (TAU * *phase).sin();
    *phase += delta;
    *phase %= 1.0;
    value
}
