import "./polyfill";
import { SineGenerator, initSync } from "@hiogawa/demo-wasm";
import { tinyassert } from "../utils/tinyassert";
import { SINE_PROCESSOR_NAME } from "./common";

const FREQUENCY = 880;

class SineProcessor extends AudioWorkletProcessor {
  private sine: SineGenerator;

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    this.port.onmessage = this.handleMessage;

    // instantiate wasm
    const { bufferSource } = options.processorOptions;
    tinyassert(bufferSource instanceof ArrayBuffer);
    initSync(bufferSource); // TODO: how long does it block? it might be better to have explicit "postMessage" communication to tell main thread when the processor is really ready.

    this.sine = SineGenerator.new();
  }

  private handleMessage = (e: MessageEvent) => {
    console.log(e);
  };

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    // TODO: handle more ports/channels
    const output = outputs[0]?.[0];
    if (!output) {
      return true;
    }

    this.sine.process(output, sampleRate, FREQUENCY);
    return true;
  }
}

registerProcessor(SINE_PROCESSOR_NAME, SineProcessor);
