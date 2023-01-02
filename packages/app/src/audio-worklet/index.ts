import "./polyfill";
import { SINE_PROCESSOR_NAME } from "./common";
import { SineProcessor } from "./sine-processor";

registerProcessor(SINE_PROCESSOR_NAME, SineProcessor);
