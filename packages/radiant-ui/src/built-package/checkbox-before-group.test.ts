import { describe, expect, it } from 'vitest';

/**
 * Imports the built package (`dist/`) with the checkbox entry first, the order the docs use. Each test file gets its
 * own module graph, so the import order here is the only one this file exercises.
 */
describe('checkbox group over built entries', () => {
	it('reports the value of a checked checkbox when checkbox loads before checkbox-group', async () => {
		await import('../../dist/components/ui/checkbox/index.js');
		await import('../../dist/components/ui/checkbox-group/index.js');
		await Promise.all([
			customElements.whenDefined('rui-checkbox'),
			customElements.whenDefined('rui-checkbox-group'),
		]);

		const group = document.createElement('rui-checkbox-group') as HTMLElement & { value: string[] };
		group.innerHTML = `<rui-checkbox value="melee"><input type="checkbox" data-ref="input" data-rui-control /></rui-checkbox>`;
		document.body.append(group);
		const box = group.querySelector('rui-checkbox') as HTMLElement & { checked: boolean };
		group.querySelector('input')!.click();
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

		expect(box.checked).toBe(true);
		expect(group.value).toEqual(['melee']);
		group.remove();
	});
});
