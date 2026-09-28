import { describe, expect, it } from 'vitest';
import Controls from './controls';
import type { DocsMetaAny, DocsStoryAny } from '@/lib/docs-stories';

function story(): DocsStoryAny {
	return { args: {}, parameters: { docs: { id: 'controls-test' } } } as DocsStoryAny;
}

describe('component docs controls', () => {
	it('omits the controls component when the story has no control definitions', () => {
		const result = Controls({ of: story(), meta: {} as DocsMetaAny });

		expect(result).toBeNull();
	});

	it('renders the controls component when a story has controls', () => {
		const result = Controls({
			of: story(),
			meta: { argTypes: { disabled: { control: { type: 'boolean' } } } } as DocsMetaAny,
		});

		expect(result).not.toBeNull();
	});
});
