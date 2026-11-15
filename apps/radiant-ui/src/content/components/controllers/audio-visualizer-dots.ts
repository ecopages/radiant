import {
	bandPeak,
	createCanvasSurface,
	logBands,
	type AudioFrame,
	type AudioVisualizerPreset,
	type CanvasSurface,
} from '@ecopages/radiant-ui/controllers';

export function dots(count = 12): AudioVisualizerPreset {
	const bands = logBands(count);
	let surface: CanvasSurface | null = null;
	return {
		mount: (target) => {
			surface = createCanvasSurface(target);
		},
		draw(frame: AudioFrame) {
			const canvas = surface as CanvasSurface;
			const { context, width, height } = canvas;
			canvas.clear();
			context.fillStyle = canvas.resolveColor('--primary');
			bands.forEach((band, index) => {
				const level = bandPeak(frame.frequency, frame.sampleRate, frame.fftSize, band);
				const radius = 2 + level * (height / 2 - 2);
				context.beginPath();
				context.arc(((index + 0.5) * width) / count, height / 2, radius, 0, Math.PI * 2);
				context.fill();
			});
		},
		rest: () => surface?.clear(),
		destroy() {
			surface?.destroy();
			surface = null;
		},
	};
}
