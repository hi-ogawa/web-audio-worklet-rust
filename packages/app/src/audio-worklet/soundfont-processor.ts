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

  noteOn(key: number) {
    tinyassert(soundfontPlayer);
    soundfontPlayer.note_on(key, 127);
  }

  noteOff(key: number) {
    tinyassert(soundfontPlayer);
    soundfontPlayer.note_off(key);
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
