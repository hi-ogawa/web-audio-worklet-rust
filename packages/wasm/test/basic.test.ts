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
    const soundfontData = await fs.promises.readFile("misc/sin.sf2");
    soundfontPlayer.add_soundfont("test", soundfontData);

    // get_state
    let state = soundfontPlayer.get_state();
    expect(state).toMatchInlineSnapshot(`
      {
        "current_preset": {
          "bank": 0,
          "id": "sin.sf2 (default)-Sine Wave-0-0",
          "name": "Sine Wave",
          "preset_num": 0,
          "soundfont_id": "sin.sf2 (default)",
        },
        "soundfonts": [
          {
            "id": "sin.sf2 (default)",
            "presets": [
              {
                "bank": 0,
                "id": "sin.sf2 (default)-Sine Wave-0-0",
                "name": "Sine Wave",
                "preset_num": 0,
                "soundfont_id": "sin.sf2 (default)",
              },
            ],
          },
          {
            "id": "test",
            "presets": [
              {
                "bank": 0,
                "id": "test-Sine Wave-0-0",
                "name": "Sine Wave",
                "preset_num": 0,
                "soundfont_id": "test",
              },
            ],
          },
        ],
      }
    `);

    // set_preset
    soundfontPlayer.set_preset(
      state.soundfonts[1].id,
      state.soundfonts[1].presets[0].id
    );

    // get_state
    expect(soundfontPlayer.get_state().current_preset).toMatchInlineSnapshot(`
      {
        "bank": 0,
        "id": "test-Sine Wave-0-0",
        "name": "Sine Wave",
        "preset_num": 0,
        "soundfont_id": "test",
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
        soundfontPlayer.add_soundfont("test", soundfont)
      ).toThrowErrorMatchingInlineSnapshot('"failed to load soundfont data"');
    });
  });

  describe("add_soundfonts_from_file", () => {
    it("success", async () => {
      const soundfontPlayer = SoundfontPlayer.new(48000);
      const archive = await fs.promises.readFile("misc/sin.tar.gz");
      soundfontPlayer.add_soundfonts_from_file("sin.tar.gz", archive);
      expect(soundfontPlayer.get_state()).toMatchInlineSnapshot(`
        {
          "current_preset": {
            "bank": 0,
            "id": "sin.sf2 (default)-Sine Wave-0-0",
            "name": "Sine Wave",
            "preset_num": 0,
            "soundfont_id": "sin.sf2 (default)",
          },
          "soundfonts": [
            {
              "id": "sin.sf2 (default)",
              "presets": [
                {
                  "bank": 0,
                  "id": "sin.sf2 (default)-Sine Wave-0-0",
                  "name": "Sine Wave",
                  "preset_num": 0,
                  "soundfont_id": "sin.sf2 (default)",
                },
              ],
            },
            {
              "id": "sin.sf2",
              "presets": [
                {
                  "bank": 0,
                  "id": "sin.sf2-Sine Wave-0-0",
                  "name": "Sine Wave",
                  "preset_num": 0,
                  "soundfont_id": "sin.sf2",
                },
              ],
            },
          ],
        }
      `);
    });
  });
});
