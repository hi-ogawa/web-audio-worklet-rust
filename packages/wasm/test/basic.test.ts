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
        "__fake": null,
        "current_bank": 0,
        "current_preset": 0,
        "current_soundfont": "sin.sf2 (default)",
        "soundfonts": {
          "sin.sf2 (default)": {
            "presets": [
              {
                "bank": 0,
                "id": "Sine Wave-0-0",
                "name": "Sine Wave",
                "preset": 0,
              },
            ],
          },
          "xxx": {
            "presets": [
              {
                "bank": 0,
                "id": "Sine Wave-0-0",
                "name": "Sine Wave",
                "preset": 0,
              },
            ],
          },
        },
      }
    `);

    // set_preset
    soundfontPlayer.set_preset("xxx", 0, 0);
    expect(soundfontPlayer.get_state()).toMatchInlineSnapshot(`
      {
        "__fake": null,
        "current_bank": 0,
        "current_preset": 0,
        "current_soundfont": "xxx",
        "soundfonts": {
          "sin.sf2 (default)": {
            "presets": [
              {
                "bank": 0,
                "id": "Sine Wave-0-0",
                "name": "Sine Wave",
                "preset": 0,
              },
            ],
          },
          "xxx": {
            "presets": [
              {
                "bank": 0,
                "id": "Sine Wave-0-0",
                "name": "Sine Wave",
                "preset": 0,
              },
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

  it("basic-v2", async () => {
    // new
    const soundfontPlayer = SoundfontPlayer.new(48000);

    // add_soundfont
    const soundfontData = await fs.promises.readFile("misc/sin.sf2");
    soundfontPlayer.add_soundfont_v2("test", soundfontData);

    // get_state
    let state = soundfontPlayer.get_state_v2();
    expect(state).toMatchInlineSnapshot(`
      {
        "current_preset": {
          "bank": 0,
          "id": "sin.sf2 (default)-Sine Wave-0-0",
          "name": "Sine Wave",
          "preset_num": 0,
          "soundfont_id": "sin.sf2 (default)",
        },
        "current_soundfont": "sin.sf2 (default)",
        "soundfonts_v2": [
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
    soundfontPlayer.set_preset_v2(
      state.soundfonts_v2[1].id,
      state.soundfonts_v2[1].presets[0].id
    );

    // get_state
    expect(soundfontPlayer.get_state_v2().current_preset)
      .toMatchInlineSnapshot(`
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
        soundfontPlayer.add_soundfont("xxx", soundfont)
      ).toThrowErrorMatchingInlineSnapshot('"failed to load soundfont data"');
    });
  });
});
