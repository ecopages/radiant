import { afterEach, vi } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { describeVoiceMemoForm } from './voice-memo-shared';
import { mountController } from './mount-recipe';
import { afterDeferredDestroy } from './until';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	syncExamples();
});

describeVoiceMemoForm('controller', {
	mount: () => mountController('voice-memo'),
	remove: async (root) => {
		root.remove();
		syncExamples();
		await afterDeferredDestroy();
	},
});
