import { beforeAll, describe, expect, it } from "vitest";
import { initSync, SoundfontPlayer } from "../pkg/index";
import fs from "node:fs";

beforeAll(async () => {
  const wasmSource = await fs.promises.readFile("pkg/index_bg.wasm");
  const wasmModule = await WebAssembly.compile(wasmSource);
  initSync(wasmModule);
});

describe("SoundfontPlayer", () => {
  it("basic", async () => {
    // new
    const soundfontPlayer = SoundfontPlayer.new(48000);

    // add_soundfont
    const soundfont = await fs.promises.readFile("misc/sin.sf2");
    soundfontPlayer.add_soundfont("xxx", soundfont);
    expect(soundfontPlayer.get_state()).toMatchInlineSnapshot(`
      {
        "current_bank": 0,
        "current_preset": 0,
        "current_soundfont": "sin.sf2 (default)",
        "soundfonts": Map {
          "sin.sf2 (default)" => {
            "presets": [
              [
                "Sine Wave",
                0,
                0,
              ],
            ],
          },
          "xxx" => {
            "presets": [
              [
                "Sine Wave",
                0,
                0,
              ],
            ],
          },
        },
      }
    `);

    // set_preset
    soundfontPlayer.set_preset("xxx", 0, 0);
    expect(soundfontPlayer.get_state()).toMatchInlineSnapshot(`
      {
        "current_bank": 0,
        "current_preset": 0,
        "current_soundfont": "xxx",
        "soundfonts": Map {
          "sin.sf2 (default)" => {
            "presets": [
              [
                "Sine Wave",
                0,
                0,
              ],
            ],
          },
          "xxx" => {
            "presets": [
              [
                "Sine Wave",
                0,
                0,
              ],
            ],
          },
        },
      }
    `);

    // process
    let output = [new Float32Array(128), new Float32Array(128)];
    soundfontPlayer.process(output[0], output[1]);

    // note_on
    soundfontPlayer.note_on(72, 100);

    // process
    soundfontPlayer.process(output[0], output[1]);

    // note_off
    soundfontPlayer.note_off(72);

    // process
    soundfontPlayer.process(output[0], output[1]);
  });

  describe("add_soundfont", () => {
    it("error", async () => {
      const soundfontPlayer = SoundfontPlayer.new(48000);

      // invalid data
      const soundfont = await fs.promises.readFile("misc/README.md");
      expect(() =>
        soundfontPlayer.add_soundfont("xxx", soundfont)
      ).toThrowErrorMatchingInlineSnapshot(
        '"failed to load soundfont data (oxisynth::SoundFont::load)"'
      );
    });
  });
});
