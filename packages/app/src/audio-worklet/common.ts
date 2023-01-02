import { z } from "zod";

export const MAIN_PROCESSOR_NAME = "main";
export const WRAPPER_PROCESSOR_NAME = "wrapper";

export const Z_WRAPPER_MESSAGE_TYPE = z.enum(["initialize"]);

export const Z_WRAPPER_MESSAGE_REQUEST = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(Z_WRAPPER_MESSAGE_TYPE.enum.initialize),
    wasmUrl: z.string(),
  }),
]);

export const Z_WRAPPER_MESSAGE_RESPONSE = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(Z_WRAPPER_MESSAGE_TYPE.enum.initialize),
    success: z.boolean(),
  }),
]);

export type WrapperMessageRequest = z.infer<typeof Z_WRAPPER_MESSAGE_REQUEST>;

export type WrapperMessageResponse = z.infer<typeof Z_WRAPPER_MESSAGE_RESPONSE>;
