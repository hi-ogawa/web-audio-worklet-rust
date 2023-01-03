// https://github.com/robbert-vdh/nih-plug/blob/ab9adaf13e3d6be00b8f4a0f7bf32cf2329779a9/src/util.rs

import { tinyassert } from "./tinyassert";

export function gainToDecibel(gain: number): number {
  gain = Math.max(1e-5, gain); // minmum -100 dB
  return Math.log10(gain) * 20;
}

export function decibelToGain(db: number): number {
  return 10 ** (db / 20);
}

// A5 = 69
// C5 = 72 = (5 + 1) * 12
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function parseMidiNote(note: string): number {
  const index = NOTES.indexOf(note.slice(0, note.length - 1));
  tinyassert(index >= 0);

  const octave = Number(note[note.length - 1]);
  tinyassert(Number.isInteger(octave));
  tinyassert(1 <= octave && octave < 10);

  return index + (octave + 1) * 12;
}

export function stringifyMidiNote(note: number): string {
  tinyassert(Number.isInteger(note));
  return NOTES[note % 12] + String(Math.floor(note / 12) - 1);
}

export function midiNoteToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
