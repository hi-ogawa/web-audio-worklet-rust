use std::{collections::HashMap, io::Cursor};

use oxisynth::{MidiEvent, Preset, SoundFont, Synth};
use schemars::JsonSchema;
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct SoundfontPlayer {
    #[serde(skip)]
    synth: Synth,
    // Synth's internal soundfont/preset state is hard to probe, so we manage JS facing state by ourselves
    #[serde(skip)]
    soundfonts: HashMap<String, SoundFont>,
    current_soundfont: String,
    current_preset_id: String, // TODO
}

// embed 1KB of simple soundfont as default fallback
const DEFAULT_SOUNDFONT_BYTES: &[u8] = include_bytes!("../misc/sin.sf2");
const DEFAULT_SOUNDFONT_NAME: &str = "sin.sf2 (default)";

// use only single channel
const DEFAULT_CHANNEL: u8 = 0;

#[wasm_bindgen]
impl SoundfontPlayer {
    pub fn new(sample_rate: f32) -> Self {
        let mut synth = Synth::default();
        synth.set_sample_rate(sample_rate);

        let mut cursor = Cursor::new(DEFAULT_SOUNDFONT_BYTES);
        let soundfont = SoundFont::load(&mut cursor).unwrap();
        let soundfont_id = synth.add_font(soundfont.clone(), true);
        synth
            .program_select(DEFAULT_CHANNEL, soundfont_id, 0, 0)
            .unwrap();

        let mut soundfonts = HashMap::new();
        soundfonts.insert(DEFAULT_SOUNDFONT_NAME.to_string(), soundfont);
        let current_soundfont = DEFAULT_SOUNDFONT_NAME.to_string();
        let current_preset_id = "".to_string();

        Self {
            synth,
            soundfonts,
            current_soundfont,
            current_preset_id,
        }
    }

    pub fn get_state(&self) -> Result<JsSoundfontPlayerDts, JsError> {
        let result: JsSoundfontPlayer = self.into();
        Ok(result
            .serialize(&serde_wasm_bindgen::Serializer::json_compatible())?
            .into())
    }

    pub fn note_on(&mut self, key: u8, vel: u8) {
        self.synth
            .send_event(MidiEvent::NoteOn {
                channel: DEFAULT_CHANNEL,
                key,
                vel,
            })
            .unwrap();
    }

    pub fn note_off(&mut self, key: u8) {
        self.synth
            .send_event(MidiEvent::NoteOff {
                channel: DEFAULT_CHANNEL,
                key,
            })
            .unwrap();
    }

    pub fn set_gain(&mut self, gain: f32) {
        self.synth.set_gain(gain);
    }

    pub fn add_soundfont(&mut self, name: String, data: &[u8]) -> Result<(), JsError> {
        // parse soundfont
        let mut cursor = Cursor::new(data);
        let soundfont = SoundFont::load(&mut cursor)
            .map_err(|_| JsError::new("failed to load soundfont data"))?;

        // add soundfont
        self.soundfonts.insert(name, soundfont);
        Ok(())
    }

    pub fn set_preset(
        &mut self,
        soundfont_name: String,
        bank_num: u32,
        preset_num: u8,
    ) -> Result<(), JsError> {
        let soundfont = self
            .soundfonts
            .get(&soundfont_name)
            .map_or_else(|| Err(JsError::new("invalid soundfont name")), Ok)?;

        // remove current font
        self.synth.font_bank_mut().reset();

        // load soundfont and set preset
        let soundfont_id = self.synth.add_font(soundfont.clone(), true);
        self.synth.program_select(
            DEFAULT_CHANNEL,
            soundfont_id,
            bank_num,
            preset_num.try_into().unwrap(),
        )?;
        self.current_soundfont = soundfont_name;
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

#[derive(Serialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct JsSoundfontPlayer {
    soundfonts: HashMap<String, JsSoundfont>,
    current_soundfont: String,
    current_preset_id: String,
    current_bank: u32,
    current_preset: u32,
}

impl From<&SoundfontPlayer> for JsSoundfontPlayer {
    fn from(o: &SoundfontPlayer) -> Self {
        let (_, current_bank, current_preset) = o.synth.get_program(DEFAULT_CHANNEL).unwrap();
        Self {
            soundfonts: o
                .soundfonts
                .iter()
                .map(|(k, v)| (k.clone(), v.into()))
                .collect(),
            current_soundfont: o.current_soundfont.clone(),
            current_preset_id: o.current_preset_id.clone(),
            current_bank,
            current_preset,
        }
    }
}

#[derive(Serialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct JsSoundfont {
    pub presets: Vec<JsPreset>,
}

impl From<&SoundFont> for JsSoundfont {
    fn from(o: &SoundFont) -> Self {
        Self {
            presets: o.presets.iter().map(|p| p.as_ref().into()).collect(),
        }
    }
}

#[derive(Serialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct JsPreset {
    pub id: String,
    pub name: String,
    pub bank: u32,
    pub preset: u32,
}

impl From<&Preset> for JsPreset {
    fn from(o: &Preset) -> Self {
        let name = o.name().to_string();
        let bank = o.banknum();
        let preset = o.num();
        let id = format!("{}-{}-{}", name, bank, preset);
        Self {
            id,
            name,
            bank,
            preset,
        }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "JsSoundfontPlayer")]
    pub type JsSoundfontPlayerDts;
}

#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_EXTRA: &'static str = r#"
/* __TYPESCRIPT_EXTRA__START__ */

import { JsSoundfontPlayer, JsSoundfont } from "./types";
export { JsSoundfontPlayer, JsSoundfont }

/* __TYPESCRIPT_EXTRA__END__ */
"#;

#[cfg(test)]
pub mod tests {
    use super::JsSoundfontPlayer;
    use schemars::schema_for;
    use wasm_bindgen_test::*;
    use web_sys::console;

    #[wasm_bindgen_test]
    fn export_json_schema() {
        let schema = schema_for!(JsSoundfontPlayer);
        let schema_str = serde_json::to_string_pretty(&schema).unwrap();
        if cfg!(feature = "export_json_schema") {
            console::log_1(&"__JSON_SCHEMA_START__".into());
            console::log_1(&schema_str.into());
            console::log_1(&"__JSON_SCHEMA_END__".into());
        }
    }
}
