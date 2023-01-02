import "./polyfill";
import { SINE_PROCESSOR_NAME, SOUNDFONT_PROCESSOR_NAME } from "./common";
import { SineProcessor } from "./sine-processor";
import { SoundfontProcessor } from "./soundfont-processor";

registerProcessor(SINE_PROCESSOR_NAME, SineProcessor);
registerProcessor(SOUNDFONT_PROCESSOR_NAME, SoundfontProcessor);
