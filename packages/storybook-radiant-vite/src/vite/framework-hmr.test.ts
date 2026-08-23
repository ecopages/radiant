import { describe, expect, it } from 'vitest';
import { isCustomElementStoryModule } from './framework-hmr.ts';

describe('isCustomElementStoryModule', () => {
	it('matches story modules that declare a custom element', () => {
		const source = `import { customElement } from '@ecopages/radiant';\n@customElement('demo-foo')\nclass DemoFoo {}`;
		expect(isCustomElementStoryModule('/src/foo.stories.tsx', source)).toBe(true);
	});

	it('ignores non-story modules', () => {
		expect(isCustomElementStoryModule('/src/foo.tsx', '@customElement("x")')).toBe(false);
	});

	it('ignores story modules without custom elements', () => {
		expect(isCustomElementStoryModule('/src/foo.stories.tsx', 'export default {}')).toBe(false);
	});
});
