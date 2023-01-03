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
    return soundfontPlayer.get_state();
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
    soundfontPlayer.add_soundfont(name, new Uint8Array(data));
  }

  setPreset(name: string, bank: number, preset: number): void {
    soundfontPlayer.set_preset(name, bank, preset);
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
