export function cls(...values: unknown[]): string {
  return values.filter(Boolean).join(" ");
}

// convert to usual key/value objects since AudioParamMap is too clumsy to work with
export function normalizeAudioParamMap(
  audioParamMap: AudioParamMap
): Record<string, AudioParam> {
  const record: Record<string, AudioParam> = {};
  audioParamMap.forEach((v, k) => {
    record[k] = v;
  });
  return record;
}
