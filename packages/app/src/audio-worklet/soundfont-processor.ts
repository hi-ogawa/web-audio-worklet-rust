import { initSync, SoundfontPlayer } from "@hiogawa/demo-wasm";
import { tinyassert } from "../utils/tinyassert";
import { expose } from "comlink";

let soundfontPlayer: SoundfontPlayer;

export class SoundfontProcessor extends AudioWorkletProcessor {
  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    expose(this, this.port);
  }

  initialize(bufferSource: ArrayBuffer) {
    tinyassert(!soundfontPlayer);
    initSync(bufferSource);
    soundfontPlayer = SoundfontPlayer.new(sampleRate);
    soundfontPlayer.set_gain(0.5);
  }

  getState() {
    return soundfontPlayer.get_state_v2();
  }

  noteOn(key: number) {
    tinyassert(soundfontPlayer);
    soundfontPlayer.note_on(key, 127);
  }

  noteOff(key: number) {
    tinyassert(soundfontPlayer);
    soundfontPlayer.note_off(key);
  }

  addSoundfont(name: string, data: ArrayBuffer): void {
    soundfontPlayer.add_soundfont_v2(name, new Uint8Array(data));
  }

  setPreset(soundfontId: string, presetId: string): void {
    soundfontPlayer.set_preset_v2(soundfontId, presetId);
  }

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const out_l = outputs[0]?.[0];
    const out_r = outputs[0]?.[1];
    if (!soundfontPlayer || !out_l || !out_r) {
      return false;
    }
    soundfontPlayer.process(out_l, out_r);
    return true;
  }
}
