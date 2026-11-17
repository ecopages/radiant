import { afterEach, vi } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { describeVoiceMemoForm } from './voice-memo-shared';
import { mountForm } from './mount-recipe';
import { afterDeferredDestroy } from './until';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	syncExamples();
});

describeVoiceMemoForm('element', {
	mount: () => mountForm('voice-memo', 'radiant'),
	remove: async (root) => {
		root.remove();
		syncExamples();
		await afterDeferredDestroy();
	},
});
