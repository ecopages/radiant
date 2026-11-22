import { describe, expect, it } from 'vitest';
import { RAW_TEXT_ELEMENT_NAMES as fromSubpath } from '../src/raw-text-element-names';
import { RAW_TEXT_ELEMENT_NAMES as fromServer } from '../src/server';

describe('raw text element names entry', () => {
	it('is the same set the server entry exports, so the lighter import changes nothing', () => {
		expect(fromSubpath).toBe(fromServer);
		expect(fromSubpath.has('script')).toBe(true);
	});
});
