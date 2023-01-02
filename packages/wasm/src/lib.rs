use std::f32::consts::TAU;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Sine {
    phase: f32,
}

#[wasm_bindgen]
impl Sine {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }

    // TODO: how to pass multiple ports/channels efficiently
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process
    // https://rustwasm.github.io/docs/wasm-bindgen/reference/types/number-slices.html
    pub fn process(&mut self, out_samples: &mut [f32], sample_rate: f32, frequency: f32) -> bool {
        for sample in out_samples {
            *sample = next_sine(&mut self.phase, frequency / sample_rate);
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
