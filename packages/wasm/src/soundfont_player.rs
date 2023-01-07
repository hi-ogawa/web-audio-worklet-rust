use std::{io::Cursor, sync::Arc};

use gloo_utils::format::JsValueSerdeExt;
use oxisynth::{MidiEvent, Preset, SoundFont, Synth};
use schemars::JsonSchema;
use serde::Serialize;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, JsonSchema)]
#[serde(rename = "SoundfontPlayerState")]
pub struct SoundfontPlayer {
    #[serde(skip)]
    synth: Synth,
    // Synth's internal soundfont/preset state is hard to probe, so we manage JS facing state by ourselves
    soundfonts: Vec<SoundfontWrapper>,
    current_preset: Option<PresetWrapper>,
}

#[derive(Serialize, JsonSchema)]
struct SoundfontWrapper {
    #[serde(skip)]
    inner: SoundFont,
    id: String,
    presets: Vec<PresetWrapper>,
}

impl SoundfontWrapper {
    fn new(id: String, inner: SoundFont) -> Self {
        Self {
            inner: inner.clone(),
            id: id.clone(),
            presets: inner
                .clone()
                .presets
                .iter()
                .map(|p| PresetWrapper::new(id.clone(), p.clone()))
                .collect(),
        }
    }
}

#[derive(Serialize, JsonSchema, Clone)]
struct PresetWrapper {
    // inner: Arc<Preset>, // not used
    soundfont_id: String,
    id: String,
    name: String,
    bank: u32,
    preset_num: u32,
}

impl PresetWrapper {
    fn new(soundfont_id: String, inner: Arc<Preset>) -> Self {
        let name = inner.name().to_string();
        let bank = inner.banknum();
        let preset_num = inner.num();
        let id = format!("{}-{}-{}-{}", soundfont_id, name, bank, preset_num);
        Self {
            soundfont_id,
            id,
            name,
            bank,
            preset_num,
        }
    }
}

// embed 1KB of simple soundfont as default fallback
const DEFAULT_SOUNDFONT_BYTES: &[u8] = include_bytes!("../misc/sin.sf2");
const DEFAULT_SOUNDFONT_NAME: &str = "sin.sf2 (default)";

// use only single channel
const DEFAULT_CHANNEL: u8 = 0;

#[wasm_bindgen]
impl SoundfontPlayer {
    pub fn new(sample_rate: f32) -> Result<SoundfontPlayer, JsError> {
        let mut result = Self {
            synth: Synth::default(),
            soundfonts: vec![],
            current_preset: None,
        };
        result.synth.set_sample_rate(sample_rate);
        result.add_soundfont(DEFAULT_SOUNDFONT_NAME, DEFAULT_SOUNDFONT_BYTES)?;
        result.set_preset(
            &result.soundfonts[0].id.clone(),
            &result.soundfonts[0].presets[0].id.clone(),
        )?;
        Ok(result)
    }

    fn find_soundfont(&self, soundfont_id: &str) -> Option<&SoundfontWrapper> {
        self.soundfonts
            .iter()
            .find(|soundfont| soundfont.id == soundfont_id)
    }

    pub fn add_soundfont(
        &mut self,
        soundfont_id: &str,
        soundfont_data: &[u8],
    ) -> Result<(), JsError> {
        if self.find_soundfont(soundfont_id).is_some() {
            return Err(JsError::new("duplicate soundfond id"));
        }

        // parse
        let mut cursor = Cursor::new(soundfont_data);
        let soundfont = SoundFont::load(&mut cursor)
            .map_err(|_| JsError::new("failed to load soundfont data"))?;

        // update state
        self.soundfonts.push(SoundfontWrapper::new(
            soundfont_id.to_string(),
            soundfont.clone(),
        ));
        Ok(())
    }

    pub fn add_soundfonts_from_file(
        &mut self,
        file_name: &str,
        file_data: &[u8],
    ) -> Result<(), JsError> {
        let mut found = false;
        if file_name.ends_with(".sf2") {
            self.add_soundfont(file_name, file_data)?;
            found = true;
        }
        if file_name.ends_with(".tar.gz") {
            let decoded = flate2::read::GzDecoder::new(file_data);
            let mut archive = tar::Archive::new(decoded);
            for entry in archive.entries()? {
                let mut entry = entry?;
                let path = entry.path()?;
                let basename = path
                    .file_name()
                    .map_or_else(|| Err(JsError::new("invalid file")), Ok)?
                    .to_string_lossy()
                    .into_owned();
                if basename.ends_with("sf2") {
                    let mut cursor = Cursor::new(Vec::new());
                    std::io::copy(&mut entry, &mut cursor)?;
                    self.add_soundfont(&basename, cursor.get_ref())?;
                    found = true;
                }
            }
        }
        if file_name.ends_with(".zip") {
            let mut archive = zip::ZipArchive::new(Cursor::new(file_data))?;
            for i in 0..archive.len() {
                let mut file = archive.by_index(i)?;
                if file.name().ends_with(".sf2") {
                    let mut cursor = Cursor::new(Vec::new());
                    std::io::copy(&mut file, &mut cursor)?;
                    self.add_soundfont(file.name(), cursor.get_ref())?;
                    found = true;
                }
            }
        }
        if found {
            Ok(())
        } else {
            Err(JsError::new("invalid file"))
        }
    }

    pub fn set_preset(&mut self, soundfont_id: &str, preset_id: &str) -> Result<(), JsError> {
        // find preset
        let soundfont = self
            .find_soundfont(soundfont_id)
            .map_or_else(|| Err(JsError::new("not found soundfont id")), Ok)?;
        let soundfont_inner = soundfont.inner.clone();
        let preset = soundfont
            .presets
            .iter()
            .find(|p| p.id == preset_id)
            .map_or_else(|| Err(JsError::new("not found preset id")), Ok)?
            .clone();

        // reset soundfonts
        self.synth.font_bank_mut().reset();

        // load soundfont and set preset
        let internal_id = self.synth.add_font(soundfont_inner, true);
        self.synth.program_select(
            DEFAULT_CHANNEL,
            internal_id,
            preset.bank,
            preset.preset_num.try_into().unwrap(),
        )?;

        // update state
        self.current_preset = Some(preset);
        Ok(())
    }

    pub fn get_state(&self) -> Result<SoundfontPlayerStateDts, JsError> {
        Ok(JsValue::from_serde(self)?.into())
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

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "SoundfontPlayerState")]
    pub type SoundfontPlayerStateDts;
}

#[wasm_bindgen(typescript_custom_section)]
const TYPESCRIPT_EXTRA: &'static str = r#"
/* __TYPESCRIPT_EXTRA__START__ */

import { SoundfontPlayerState } from "./types";
export { SoundfontPlayerState }

/* __TYPESCRIPT_EXTRA__END__ */
"#;

#[cfg(test)]
pub mod tests {
    use schemars::schema_for;
    use wasm_bindgen_test::*;
    use web_sys::console;

    #[wasm_bindgen_test]
    fn export_json_schema() {
        let schema = schema_for!(super::SoundfontPlayer);
        let schema_str = serde_json::to_string_pretty(&schema).unwrap();
        if cfg!(feature = "export_json_schema") {
            console::log_1(&"__JSON_SCHEMA_START__".into());
            console::log_1(&schema_str.into());
            console::log_1(&"__JSON_SCHEMA_END__".into());
        }
    }
}
