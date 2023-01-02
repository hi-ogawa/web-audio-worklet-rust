use std::io::Cursor;

use oxisynth::{MidiEvent, Synth};
use wasm_bindgen::prelude::wasm_bindgen;

// https://github.com/hi-ogawa/nih-plug-examples/blob/5fc76d775a025f690b31d58cec74ab242b02556b/examples/soundfont_player/src/lib.rs

#[wasm_bindgen]
pub struct SoundfontPlayer {
    synth: Synth,
}

// embed 1KB of simple soundfont as default fallback
const DEFAULT_SOUNDFONT_BYTES: &[u8] = include_bytes!("../misc/sin.sf2");

#[wasm_bindgen]
impl SoundfontPlayer {
    pub fn new(sample_rate: f32) -> Self {
        let mut synth = Synth::default();
        synth.set_sample_rate(sample_rate);

        let mut cursor = Cursor::new(DEFAULT_SOUNDFONT_BYTES);
        let soundfont = oxisynth::SoundFont::load(&mut cursor).unwrap();
        synth.add_font(soundfont, true);

        Self { synth }
    }

    pub fn note_on(&mut self, key: u8) {
        self.synth
            .send_event(MidiEvent::NoteOn {
                channel: 0,
                key,
                vel: 100,
            })
            .unwrap();
    }

    pub fn note_off(&mut self, key: u8) {
        self.synth
            .send_event(MidiEvent::NoteOff { channel: 0, key })
            .unwrap();
    }

    pub fn set_gain(&mut self, gain: f32) {
        self.synth.set_gain(gain);
    }

    pub fn process(&mut self, out_samples_l: &mut [f32], out_samples_r: &mut [f32]) -> bool {
        for (sample_l, sample_r) in out_samples_l.iter_mut().zip(out_samples_r) {
            // synthesize single sample of left/right
            let mut synth_samples = [0f32; 2];
            self.synth.write(&mut synth_samples[..]);
            *sample_l = synth_samples[0];
            *sample_r = synth_samples[1];
        }
        true
    }
}
