import { fileURLToPath } from 'node:url';
import type { PresetProperty } from 'storybook/internal/types';

/**
 * Thin renderer preset — only wires client preview annotations.
 * Kept separate from the framework preset so `viteFinal` is not applied twice.
 */
export const previewAnnotations: PresetProperty<'previewAnnotations'> = async (input = []) => {
	const entryPreview = fileURLToPath(new URL('./entry-preview.js', import.meta.url));
	return [...input, entryPreview];
};
