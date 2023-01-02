export function gainToDecibel(gain: number): number {
  gain = Math.max(1e-5, gain); // minmum -100 dB
  return Math.log10(gain) * 20;
}

export function decibelToGain(db: number): number {
  return 10 ** (db / 20);
}
