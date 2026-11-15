import { afterEach, vi } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { describeVoiceMemoForm } from './voice-memo-shared';
import { mountRecipe } from './mount-recipe';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	syncExamples();
});

describeVoiceMemoForm('plain', {
	mount: () => mountRecipe('voice-memo'),
	remove: async (root) => {
		root.remove();
		syncExamples();
		await new Promise((resolve) => setTimeout(resolve, 50));
	},
});
