/**
 * Generates the sample clip of the video player recipe into `src/public/assets/video/`:
 *
 * - `radiant-reel.webm`: 12 seconds, 854x480, VP8 video (VP9 when the installed ffmpeg only has that encoder) with a
 *   keyframe every second and an Opus sound track.
 * - `radiant-reel.jpg`: the poster, one frame of the same animation.
 *
 * The captions are not generated. They are data in the recipe's `video-player.data.ts`, whose cue times follow the
 * scene starts below, because the ecopages dev and preview servers answer only a fixed list of file extensions that
 * leaves out `.vtt`.
 *
 * Run it from `apps/radiant-ui` with `node scripts/generate-video-player-assets.mjs`. It needs the Chromium and the
 * ffmpeg that Playwright installs (`pnpm exec playwright install chromium ffmpeg`), and downloads nothing.
 *
 * @remarks
 * The picture is drawn on a canvas by one pure function of time, so the poster and the clip show the same frames.
 * The canvas and a Web Audio graph are recorded in real time with `MediaRecorder` (Chromium is the only encoder
 * available offline that makes Opus), which gives a file with no duration and no cues. The bundled ffmpeg has a VP8 or
 * a VP9 encoder and the webm muxer, so it re-encodes the video with a keyframe every second, which makes seeking
 * cheap, and copies the Opus track untouched. Running the script again overwrites the two files; the sound and the
 * encoder timing differ slightly between runs, the drawn frames do not.
 *
 * Playwright keeps its browsers in `PLAYWRIGHT_BROWSERS_PATH` when that is set, and otherwise in the cache folder of
 * the platform (`~/Library/Caches/ms-playwright` on macOS, `~/.cache/ms-playwright` on Linux,
 * `%LOCALAPPDATA%\ms-playwright` on Windows), which is where the ffmpeg is looked for.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDirectory = path.join(appRoot, 'src/public/assets/video');
const work = path.join(tmpdir(), 'radiant-reel-work');
const { chromium } = createRequire(path.join(appRoot, 'package.json'))('playwright');

const WIDTH = 854;
const HEIGHT = 480;
const SECONDS = 12;
const SCENES = [
	{ from: 0, hue: 232, note: [220, 277.18, 329.63] },
	{ from: 2.4, hue: 285, note: [246.94, 311.13, 370] },
	{ from: 4.8, hue: 335, note: [261.63, 329.63, 392] },
	{ from: 7.2, hue: 18, note: [293.66, 369.99, 440] },
	{ from: 9.6, hue: 165, note: [220, 277.18, 329.63] },
];

const ffmpegRoot =
	process.env.PLAYWRIGHT_BROWSERS_PATH ??
	{
		darwin: path.join(homedir(), 'Library/Caches/ms-playwright'),
		linux: path.join(homedir(), '.cache/ms-playwright'),
		win32: path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright'),
	}[process.platform];
const ffmpegBinary = { darwin: 'ffmpeg-mac', linux: 'ffmpeg-linux', win32: 'ffmpeg-win64.exe' }[process.platform];
const ffmpegs = readdirSync(ffmpegRoot)
	.filter((name) => name.startsWith('ffmpeg-'))
	.map((name) => path.join(ffmpegRoot, name, ffmpegBinary));
const encoderOf = (binary) => {
	const listing = spawnSync(binary, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout ?? '';
	return ['libvpx', 'libvpx-vp9'].find((name) => new RegExp(`\\s${name}\\s`).test(listing));
};
const ffmpeg = ffmpegs.find(encoderOf);
if (!ffmpeg) throw new Error('No Playwright ffmpeg with a VP8 or VP9 encoder was found');
const encoder = encoderOf(ffmpeg);

/** The browser side: `draw(time)` paints one frame and `record()` captures the canvas and the tones for the length of the clip. */
const page = `
const SCENES = ${JSON.stringify(SCENES)};
const [W, H, SECONDS] = [${WIDTH}, ${HEIGHT}, ${SECONDS}];
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const ease = (x) => x * x * (3 - 2 * x);
const sceneAt = (t) => SCENES.findLast((scene) => scene.from <= t);

function draw(t) {
	const scene = sceneAt(t);
	const next = SCENES[SCENES.indexOf(scene) + 1];
	const blend = next ? ease(Math.min(1, Math.max(0, (t - (next.from - 0.6)) / 0.6))) : 0;
	const hue = scene.hue + (next ? (next.hue - scene.hue) * blend : 0);
	const sky = ctx.createLinearGradient(0, 0, W, H);
	sky.addColorStop(0, 'hsl(' + hue + ' 55% 14%)');
	sky.addColorStop(1, 'hsl(' + (hue + 40) + ' 60% 7%)');
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, W, H);

	for (let i = 0; i < 5; i++) {
		const angle = t * (0.35 + i * 0.11) + i * 1.9;
		const x = W / 2 + Math.cos(angle) * (180 + i * 50);
		const y = H / 2 + Math.sin(angle * 1.3) * (90 + i * 22);
		const radius = 150 + i * 28 + Math.sin(t * 1.4 + i) * 18;
		const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
		glow.addColorStop(0, 'hsl(' + (hue + i * 28) + ' 85% 62% / 0.62)');
		glow.addColorStop(1, 'hsl(' + (hue + i * 28) + ' 85% 62% / 0)');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, W, H);
	}

	ctx.save();
	ctx.translate(W / 2, H / 2);
	for (let i = 0; i < 6; i++) {
		ctx.save();
		ctx.rotate(t * (0.25 + i * 0.07) * (i % 2 ? -1 : 1) + i * 0.5);
		const size = 70 + i * 34;
		ctx.strokeStyle = 'hsl(' + (hue + i * 20) + ' 90% 78% / ' + (0.5 - i * 0.05) + ')';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(-size, -size, size * 2, size * 2, size * 0.28);
		ctx.stroke();
		ctx.restore();
	}
	ctx.restore();

	const whole = Math.floor(t);
	const tenths = Math.floor((t - whole) * 10);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'rgba(255,255,255,0.94)';
	ctx.font = '700 150px ui-monospace, Menlo, monospace';
	ctx.fillText('0:' + String(whole).padStart(2, '0'), W / 2, H / 2 - 6);
	ctx.fillStyle = 'rgba(255,255,255,0.6)';
	ctx.font = '500 34px ui-monospace, Menlo, monospace';
	ctx.fillText('.' + tenths, W / 2 + 214, H / 2 + 44);
	ctx.fillStyle = 'rgba(255,255,255,0.7)';
	ctx.font = '600 22px ui-sans-serif, system-ui, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText('RADIANT REEL', 36, 40);
	ctx.textAlign = 'right';
	ctx.fillText('SCENE ' + (SCENES.indexOf(scene) + 1) + ' / ' + SCENES.length, W - 36, 40);
}

window.draw = draw;
window.record = async () => {
	const audio = new AudioContext({ sampleRate: 48000 });
	await audio.resume();
	const destination = audio.createMediaStreamDestination();
	const master = audio.createGain();
	master.gain.value = 0.5;
	master.connect(destination);
	const start = audio.currentTime + 0.2;
	SCENES.forEach((scene, index) => {
		const end = index + 1 < SCENES.length ? SCENES[index + 1].from : SECONDS;
		for (const frequency of scene.note) {
			const voice = audio.createOscillator();
			const gain = audio.createGain();
			voice.type = 'triangle';
			voice.frequency.value = frequency;
			gain.gain.setValueAtTime(0, start + scene.from);
			gain.gain.linearRampToValueAtTime(0.16, start + scene.from + 0.5);
			gain.gain.linearRampToValueAtTime(0.0001, start + end);
			voice.connect(gain).connect(master);
			voice.start(start + scene.from);
			voice.stop(start + end + 0.05);
		}
	});
	for (let second = 0; second < SECONDS; second++) {
		const tick = audio.createOscillator();
		const gain = audio.createGain();
		tick.frequency.value = 880;
		gain.gain.setValueAtTime(0.12, start + second);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + second + 0.12);
		tick.connect(gain).connect(master);
		tick.start(start + second);
		tick.stop(start + second + 0.15);
	}
	const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...destination.stream.getAudioTracks()]);
	const recorder = new MediaRecorder(stream, {
		mimeType: 'video/webm;codecs=vp8,opus',
		videoBitsPerSecond: 1_200_000,
		audioBitsPerSecond: 64_000,
	});
	const chunks = [];
	recorder.ondataavailable = (event) => chunks.push(event.data);
	const stopped = new Promise((resolve) => (recorder.onstop = resolve));
	recorder.start(250);
	await new Promise((resolve) => {
		const tick = () => {
			const t = audio.currentTime - start;
			draw(Math.min(SECONDS - 0.001, Math.max(0, t)));
			if (t >= SECONDS) resolve();
			else requestAnimationFrame(tick);
		};
		tick();
	});
	recorder.stop();
	await stopped;
	const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
};
`;

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
mkdirSync(outDirectory, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await tab.setContent(`<body style="margin:0"><canvas width="${WIDTH}" height="${HEIGHT}"></canvas></body>`);
await tab.addScriptTag({ content: page });
await tab.evaluate(() => window.draw(0.6));
await tab
	.locator('canvas')
	.screenshot({ path: path.join(outDirectory, 'radiant-reel.jpg'), type: 'jpeg', quality: 82 });
const recorded = await tab.evaluate(() => window.record());
writeFileSync(path.join(work, 'recorded.webm'), Buffer.from(recorded, 'base64'));
await browser.close();

const result = spawnSync(
	ffmpeg,
	[
		'-y',
		'-i',
		path.join(work, 'recorded.webm'),
		'-c:v',
		encoder,
		'-pix_fmt',
		'yuv420p',
		'-auto-alt-ref',
		'0',
		'-b:v',
		'700k',
		'-crf',
		'12',
		'-g',
		'30',
		'-c:a',
		'copy',
		path.join(outDirectory, 'radiant-reel.webm'),
	],
	{ stdio: 'inherit' },
);
if (result.status !== 0) throw new Error('ffmpeg failed');
rmSync(work, { recursive: true, force: true });
