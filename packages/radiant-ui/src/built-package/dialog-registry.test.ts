import { describe, expect, it } from 'vitest';

/** Imports the built package (`dist/`): the registry's `instanceof RuiDialog` must hold for the shipped class. */
describe('dialog registry over built entries', () => {
	it('opens a named dialog declared in the page', async () => {
		const { openDialog, uninstallDialogs } = await import('../../dist/components/ui/dialog/index.js');
		await customElements.whenDefined('rui-dialog');

		const dialog = document.createElement('rui-dialog') as HTMLElement & { open: boolean };
		dialog.id = 'built-dialog';
		document.body.append(dialog);
		openDialog('built-dialog');

		expect(dialog.open).toBe(true);
		uninstallDialogs();
		dialog.remove();
	});
});
