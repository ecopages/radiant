import { HotkeyController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const stage = root.querySelector<HTMLElement>('[data-stage]')!;
	const status = root.querySelector('[data-status]')!;
	let playing = false;
	let position = 0;
	const show = (message: string) => (status.textContent = message);

	const hotkeys = new HotkeyController({
		getTarget: () => stage,
		hotkeys: [
			{
				keys: 'k',
				handler: () => {
					playing = !playing;
					show(playing ? `Playing at ${position} s` : `Paused at ${position} s`);
				},
			},
			{
				keys: 'shift+ArrowLeft',
				handler: () => show(`Back 1 s to ${(position = Math.max(0, position - 1))} s`),
			},
			{
				keys: 'ArrowLeft',
				handler: () => show(`Back 5 s to ${(position = Math.max(0, position - 5))} s`),
			},
			{
				keys: 'ArrowRight',
				handler: () => show(`Forward 5 s to ${(position += 5)} s`),
			},
		],
	});
	hotkeys.attach();
	return () => hotkeys.destroy();
}

mountExample('hotkey', mount);
