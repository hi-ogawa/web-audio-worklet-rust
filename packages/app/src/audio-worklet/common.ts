import { z } from "zod";
import { decibelToGain } from "../utils/conversion";

//
// SineProcessor
//

export const SINE_PROCESSOR_NAME = "custom-sine";

export const SINE_PARAMETER_DESCRIPTORS = [
  {
    name: "gain",
    defaultValue: 0,
    minValue: 0,
    maxValue: decibelToGain(10),
    automationRate: "a-rate",
  },
  {
    name: "frequency",
    defaultValue: 880,
    minValue: 10,
    maxValue: 3000,
    automationRate: "k-rate",
  },
] as const satisfies ReadonlyArray<ParameterDescriptor>;

export type SineParameterName =
  typeof SINE_PARAMETER_DESCRIPTORS[number]["name"];

//
// SoundfontProcessor
//

export const SOUNDFONT_PROCESSOR_NAME = "custom-soundfont";

// TODO: probably we can use comlink to simplify IPC https://github.com/GoogleChromeLabs/comlink
export const Z_SOUNDFONT_PROCESSOR_EVENT_TYPE = z.enum([
  "note_on",
  "note_off",
  "set_gain",
  "add_soundfont",
  "set_preset",
]);

export const Z_SOUNDFONT_PROCESSOR_EVENT = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(Z_SOUNDFONT_PROCESSOR_EVENT_TYPE.enum.note_on),
    key: z.number(),
  }),
  z.object({
    type: z.literal(Z_SOUNDFONT_PROCESSOR_EVENT_TYPE.enum.note_off),
    key: z.number(),
  }),
  z.object({
    type: z.literal(Z_SOUNDFONT_PROCESSOR_EVENT_TYPE.enum.set_gain),
    gain: z.number(),
  }),
  z.object({
    type: z.literal(Z_SOUNDFONT_PROCESSOR_EVENT_TYPE.enum.add_soundfont),
  }),
  z.object({
    type: z.literal(Z_SOUNDFONT_PROCESSOR_EVENT_TYPE.enum.set_preset),
  }),
]);

export type SoundfontProcessorEvent = z.infer<
  typeof Z_SOUNDFONT_PROCESSOR_EVENT
>;
