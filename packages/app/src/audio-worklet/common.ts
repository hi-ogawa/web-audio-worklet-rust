import { decibelToGain } from "../utils/conversion";

export const SINE_PROCESSOR_NAME = "custom-sine";

export const SINE_PARAMETER_DESCRIPTORS = [
  {
    name: "gain",
    defaultValue: decibelToGain(-10),
    minValue: decibelToGain(-40),
    maxValue: decibelToGain(10),
    automationRate: "k-rate",
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
