import { describe, expect, it } from 'vitest';

/** Imports the built package (`dist/`): the group's `instanceof RuiDisclosure` must hold for the shipped class. */
describe('disclosure group over built entries', () => {
	it('closes the other disclosures when one opens', async () => {
		await import('../../dist/components/ui/disclosure/index.js');
		await Promise.all([
			customElements.whenDefined('rui-disclosure'),
			customElements.whenDefined('rui-disclosure-group'),
		]);

		const group = document.createElement('rui-disclosure-group');
		group.innerHTML = `<rui-disclosure value="a" open></rui-disclosure><rui-disclosure value="b"></rui-disclosure>`;
		document.body.append(group);
		const [a, b] = [...group.querySelectorAll('rui-disclosure')] as Array<HTMLElement & { open: boolean }>;
		b.open = true;
		b.dispatchEvent(
			new CustomEvent('rui-disclosure-toggle', { bubbles: true, detail: { value: 'b', open: true } }),
		);

		expect(a.open).toBe(false);
		expect(b.open).toBe(true);
		group.remove();
	});
});
