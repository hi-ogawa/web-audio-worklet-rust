// https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope

type ParameterDescriptor = { name: string } & Pick<
  AudioParam,
  "automationRate" | "defaultValue" | "minValue" | "maxValue"
>;

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;

  static abstract get parameterDescriptors(): ParameterDescriptor[];

  abstract process(
    // connected-node-index => channel-index => sample index
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare const currentFrame: number;

declare const currentTime: number;

declare const sampleRate: number;

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;
