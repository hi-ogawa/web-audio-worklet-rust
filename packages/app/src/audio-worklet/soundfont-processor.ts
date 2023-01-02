import { initSync, SoundfontPlayer } from "@hiogawa/demo-wasm";
import { tinyassert } from "../utils/tinyassert";
import { Z_SOUNDFONT_PROCESSOR_EVENT } from "./common";

export class SoundfontProcessor extends AudioWorkletProcessor {
  private soundfontPlayer: SoundfontPlayer;

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    this.port.onmessage = this.handleMessage;

    // instantiate wasm
    // TODO: pass soundfont data via processorOptions
    const { processorOptions } = options;
    const { bufferSource } = processorOptions;
    tinyassert(bufferSource instanceof ArrayBuffer);
    initSync(bufferSource);

    this.soundfontPlayer = SoundfontPlayer.new(sampleRate);
    this.soundfontPlayer.set_gain(0.5);
  }

  private handleMessage = (e: MessageEvent) => {
    console.log(e.data); // TODO
    const message = Z_SOUNDFONT_PROCESSOR_EVENT.parse(e.data);
    if (message.type === "note_on") {
      this.soundfontPlayer.note_on(message.key);
    }
    if (message.type === "note_off") {
      this.soundfontPlayer.note_off(message.key);
    }
    if (message.type === "set_gain") {
      this.soundfontPlayer.set_gain(message.gain);
    }
  };

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const out_l = outputs[0]?.[0];
    const out_r = outputs[0]?.[1];
    if (!out_l || !out_r) {
      return false;
    }
    this.soundfontPlayer.process(out_l, out_r);
    return true;
  }
}
