import type { PresetProperty } from 'storybook/internal/types';
import { viteFinal } from './vite/vite-final';

export { viteFinal };

export const core: PresetProperty<'core'> = {
	builder: import.meta.resolve('@storybook/builder-vite'),
	renderer: import.meta.resolve('@ecopages/storybook-radiant-vite/renderer-preset'),
};
