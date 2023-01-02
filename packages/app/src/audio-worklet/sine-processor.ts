import { SineGenerator, initSync } from "@hiogawa/demo-wasm";
import { tinyassert } from "../utils/tinyassert";
import { SineParameterName, SINE_PARAMETER_DESCRIPTORS } from "./common";

// unused
export class SineProcessor extends AudioWorkletProcessor {
  private sine: SineGenerator;

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    this.port.onmessage = this.handleMessage;

    // instantiate wasm
    const { processorOptions } = options;
    const { bufferSource } = processorOptions;
    tinyassert(bufferSource instanceof ArrayBuffer);
    initSync(bufferSource); // TODO: is it too heavy? it might be better to have explicit "postMessage" communication to tell main thread when the processor is really ready.

    this.sine = SineGenerator.new(sampleRate);
  }

  private handleMessage = (e: MessageEvent) => {
    console.log(e);
  };

  static override get parameterDescriptors(): ReadonlyArray<ParameterDescriptor> {
    return SINE_PARAMETER_DESCRIPTORS;
  }

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<SineParameterName, Float32Array>
  ): boolean {
    // TODO: handle more ports/channels
    const output = outputs[0]?.[0];
    if (!output) {
      return true;
    }

    this.sine.process(output, parameters.frequency[0], parameters.gain[0]);
    return true;
  }
}
