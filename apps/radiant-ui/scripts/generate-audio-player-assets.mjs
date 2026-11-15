/**
 * Generates the four sample tones of the audio player recipe into `src/public/assets/audio/`: `morning-light.wav`,
 * `low-tide.wav`, `neon-rain.wav` and `paper-planes.wav`.
 *
 * Run it from `apps/radiant-ui` with `node scripts/generate-audio-player-assets.mjs`. It needs nothing but Node and
 * downloads nothing.
 *
 * @remarks
 * Each tone is a loop of plucked notes (a sine with its second and third harmonic, a short attack and an
 * exponential decay) that is normalised to its peak and faded out over the last half second. The files are 8-bit
 * mono at 11.025 kHz, which keeps four clips of about eight seconds under 400 KB in total. Nothing in the output
 * depends on the clock or on randomness, so running the script again writes the same bytes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/public/assets/audio');
const RATE = 11025;
const FADE = Math.floor(RATE * 0.5);

const frequency = (semitones) => 220 * 2 ** (semitones / 12);

/** The WAV file for 8-bit mono samples: a 44 byte header and the unsigned samples. */
const wav = (samples) => {
	const header = Buffer.alloc(44);
	header.write('RIFF', 0);
	header.writeUInt32LE(36 + samples.length, 4);
	header.write('WAVEfmt ', 8);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(1, 22);
	header.writeUInt32LE(RATE, 24);
	header.writeUInt32LE(RATE, 28);
	header.writeUInt16LE(1, 32);
	header.writeUInt16LE(8, 34);
	header.write('data', 36);
	header.writeUInt32LE(samples.length, 40);
	return Buffer.concat([header, samples]);
};

/** Plays `notes` in turn, `step` seconds apart and repeated to fill `seconds`, each ringing for `tail` seconds. */
const render = (notes, step, seconds, tail = 0.9) => {
	const length = Math.floor(RATE * seconds);
	const mix = new Float64Array(length);
	for (let index = 0; ; index++) {
		const start = Math.floor(index * step * RATE);
		if (start >= length) break;
		const pitch = frequency(notes[index % notes.length]);
		for (let k = 0; k < Math.floor(RATE * tail) && start + k < length; k++) {
			const t = k / RATE;
			const envelope = Math.exp((-4 * t) / tail) * Math.min(1, k / 80);
			mix[start + k] +=
				envelope *
				(0.6 * Math.sin(2 * Math.PI * pitch * t) +
					0.25 * Math.sin(2 * Math.PI * 2 * pitch * t) +
					0.1 * Math.sin(2 * Math.PI * 3 * pitch * t));
		}
	}
	const peak = mix.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0) || 1;
	return wav(
		Buffer.from(
			Uint8Array.from(mix, (value, j) =>
				Math.trunc(128 + (110 * Math.min(1, (length - j) / FADE) * value) / peak),
			),
		),
	);
};

mkdirSync(outDirectory, { recursive: true });
const tones = {
	'morning-light.wav': render([0, 4, 7, 12, 7, 4], 0.25, 8),
	'low-tide.wav': render([-12, -5, 0, -5, -7, 0, -3, -8], 0.5, 8, 1.4),
	'neon-rain.wav': render([3, 10, 15, 10, 12, 19, 15, 10], 0.18, 9, 0.6),
	'paper-planes.wav': render([7, 12, 16, 19, 16, 12, 14, 11, 7, 11], 0.3, 7),
};
for (const [name, bytes] of Object.entries(tones)) writeFileSync(path.join(outDirectory, name), bytes);
