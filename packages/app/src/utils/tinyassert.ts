export function tinyassert(x: any, message?: string): asserts x {
  if (!x) {
    throw new TinyassertError(message, tinyassert);
  }
}

class TinyassertError extends Error {
  constructor(message?: string, stackStartFunction?: Function) {
    super(message);
    if ("captureStackTrace" in Error) {
      // @ts-expect-error
      Error.captureStackTrace(this, stackStartFunction ?? TinyassertError);
    }
  }
}
