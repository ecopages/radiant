import type { PresetProperty } from 'storybook/internal/types';
import { viteFinal } from './vite/vite-final';

export { viteFinal };

export const core: PresetProperty<'core'> = {
	builder: import.meta.resolve('@storybook/builder-vite'),
	renderer: import.meta.resolve('@ecopages/storybook-radiant-vite/renderer-preset'),
};

/**
 * Force Vite to prebundle `react-dom` for addon-docs.
 *
 * @remarks
 * Docs chunks default-import `react-dom`. Addon-docs only lists `react-dom/client`
 * in `optimizeViteDeps`, so Vite 8 serves the raw CJS entry via `/@fs` and the
 * browser throws "does not provide an export named 'default'".
 */
export const optimizeViteDeps = ['react-dom'];
