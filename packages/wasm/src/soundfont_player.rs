use std::io::Cursor;

use oxisynth::{MidiEvent, Synth};
use wasm_bindgen::prelude::*;

// https://github.com/hi-ogawa/nih-plug-examples/blob/5fc76d775a025f690b31d58cec74ab242b02556b/examples/soundfont_player/src/lib.rs

#[wasm_bindgen]
pub struct SoundfontPlayer {
    synth: Synth,
    // routines for adding/removing soundfont is messy, so manage states by ourselves
    soundfonts: Vec<oxisynth::SoundFont>,
}

// embed 1KB of simple soundfont as default fallback
// TODO: don't have to embed to rust. move the logic to client
const DEFAULT_SOUNDFONT_BYTES: &[u8] = include_bytes!("../misc/sin.sf2");

#[wasm_bindgen]
impl SoundfontPlayer {
    pub fn new(sample_rate: f32) -> Self {
        let mut synth = Synth::default();
        synth.set_sample_rate(sample_rate);

        let mut cursor = Cursor::new(DEFAULT_SOUNDFONT_BYTES);
        let soundfont = oxisynth::SoundFont::load(&mut cursor).unwrap();
        synth.add_font(soundfont, true);

        Self {
            synth,
            soundfonts: vec![],
        }
    }

    pub fn note_on(&mut self, key: u8, vel: u8) {
        self.synth
            .send_event(MidiEvent::NoteOn {
                channel: 0,
                key,
                vel,
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

    pub fn add_soundfont(&mut self, data: &[u8]) -> Result<JsSoundfontX, JsValue> {
        // parse soundfont
        let mut cursor = Cursor::new(data);
        let soundfont = oxisynth::SoundFont::load(&mut cursor).map_err(|_| {
            serde_wasm_bindgen::Error::new(
                "failed to load soundfont data (oxisynth::SoundFont::load)",
            )
        })?;

        // add soundfont
        self.soundfonts.push(soundfont.clone());

        // return misc info
        let result = JsSoundfont {
            index: self.soundfonts.len() - 1,
            presets: soundfont
                .presets
                .clone()
                .iter()
                .map(|p| (p.name().to_string(), p.banknum(), p.num()))
                .collect(),
        };

        Ok(serde_wasm_bindgen::to_value(&result)?.into())
    }

    pub fn set_preset(
        &mut self,
        index: usize,
        bank_num: u32,
        preset_num: u8,
    ) -> Result<(), JsValue> {
        // remove current font
        self.synth.font_bank_mut().reset();

        // load soundfont and set preset
        let soundfont_id = self.synth.add_font(self.soundfonts[index].clone(), true);
        self.synth
            .program_select(0, soundfont_id, bank_num, preset_num.try_into().unwrap())
            .map_err(serde_wasm_bindgen::Error::new)?;
        Ok(())
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

// workaround js value conversion
//   https://rustwasm.github.io/wasm-bindgen/reference/attributes/on-rust-exports/typescript_type.html
//   https://github.com/rustwasm/wasm-bindgen/issues/111
#[derive(serde::Serialize, serde::Deserialize)]
pub struct JsSoundfont {
    pub index: usize,
    pub presets: Vec<(String, u32, u32)>,
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "JsSoundfont")]
    pub type JsSoundfontX;
}

#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_EXTRA: &'static str = r#"
/* TYPESCRIPT_EXTRA (START) */

export interface JsSoundfont {
    index: number;
    presets: [name: string, bank: number, program: number][];
}

/* TYPESCRIPT_EXTRA (END) */
"#;
