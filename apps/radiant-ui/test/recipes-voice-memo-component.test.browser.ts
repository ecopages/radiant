import { afterEach, vi } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { describeVoiceMemoForm } from './voice-memo-shared';
import { mountComponent } from './mount-recipe';
import { afterDeferredDestroy } from './until';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	syncExamples();
});

describeVoiceMemoForm('component', {
	mount: () => mountComponent('voice-memo'),
	remove: async (root) => {
		root.remove();
		syncExamples();
		await afterDeferredDestroy();
	},
});
