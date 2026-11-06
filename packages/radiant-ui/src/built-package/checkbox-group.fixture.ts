import { expect } from 'vitest';

/**
 * Mounts a group with one checkbox from whichever built entries are already imported, clicks it and asserts the
 * group reports its value.
 *
 * @remarks The import order lives in each test file because vitest isolates module graphs per file.
 */
export async function expectGroupFollowsCheckbox(): Promise<void> {
	await Promise.all([customElements.whenDefined('rui-checkbox'), customElements.whenDefined('rui-checkbox-group')]);

	const group = document.createElement('rui-checkbox-group') as HTMLElement & { value: string[] };
	group.innerHTML = `<rui-checkbox value="melee"><input type="checkbox" data-ref="input" data-rui-control /></rui-checkbox>`;
	document.body.append(group);
	const box = group.querySelector('rui-checkbox') as HTMLElement & { checked: boolean };
	group.querySelector('input')!.click();
	await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

	expect(box.checked).toBe(true);
	expect(group.value).toEqual(['melee']);
	group.remove();
}
