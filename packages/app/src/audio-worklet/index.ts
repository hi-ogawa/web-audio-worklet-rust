import initWasm, { Sine } from "@hiogawa/demo-wasm";
import { memoize } from "lodash";
import { tinyassert } from "../utils/tinyassert";
import {
  MAIN_PROCESSOR_NAME,
  WrapperMessageResponse,
  WRAPPER_PROCESSOR_NAME,
  Z_WRAPPER_MESSAGE_REQUEST,
} from "./common";

const initWasmMemoized = memoize(initWasm);
let initWasmSuccess = false;

const FREQUENCY = 880;

class SineProcessor extends AudioWorkletProcessor {
  private sine = new Sine();

  constructor() {
    tinyassert(initWasmSuccess);
    super();
  }

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

//
// wrapper to deal with wasm asynchronous initialization
//
class WrapperProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = this.handleMessage;
  }

  private handleMessage = async (e: MessageEvent) => {
    const message = Z_WRAPPER_MESSAGE_REQUEST.parse(e.data);
    if (message.type === "initialize") {
      try {
        await initWasmMemoized(message.wasmUrl);
        registerProcessor(MAIN_PROCESSOR_NAME, SineProcessor);
        initWasmSuccess = true;
        this.port.postMessage({
          type: "initialize",
          success: true,
        } satisfies WrapperMessageResponse);
      } catch (e) {
        this.port.postMessage({
          type: "initialize",
          success: false,
        } satisfies WrapperMessageResponse);
      }
    }
  };

  override process(
    _inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    return true;
  }
}

registerProcessor(WRAPPER_PROCESSOR_NAME, WrapperProcessor);
