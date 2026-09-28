import { describe, expect, test } from 'vitest';
import { createHydrationScriptTag, escapeHydrationJson } from '../../src/core/hydration-codec';

describe('hydration-codec', () => {
	test('createHydrationScriptTag escapes script-breaking sequences in the payload body', () => {
		const payload = JSON.stringify({ html: '</script><img src=x onerror=alert(1)>', note: '<!--' });
		const tag = createHydrationScriptTag({
			type: 'signal',
			hydrationKey: 'status',
			serializedValue: payload,
		});

		expect(tag).toContain(escapeHydrationJson(payload));
		expect(tag).not.toContain('</script><img');
		expect(tag).toContain('\\u003c/script\\u003e');
		expect(tag).toContain('\\u003c!--');
	});

	test('createHydrationScriptTag escapes hydrationKey attribute values', () => {
		const tag = createHydrationScriptTag({
			type: 'context',
			hydrationKey: 'a"b',
			serializedValue: '{}',
		});

		expect(tag).toContain('data-hydration-key="a&quot;b"');
	});
});
