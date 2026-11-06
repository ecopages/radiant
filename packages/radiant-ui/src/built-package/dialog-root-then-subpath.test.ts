import { describe, expect, it } from 'vitest';

/**
 * Imports the built package (`dist/`): the root entry defines `rui-dialog` first, then `openDialog` comes from the
 * `/dialog` subpath. Without shared chunks the subpath registry checks `instanceof` against its own `RuiDialog` copy.
 *
 * @remarks `disclosure-group` has no equivalent pairing: its class and the `RuiDisclosure` it checks always load
 * from the same entry, so there is no cross-entry case to guard.
 */
describe('dialog registry across root and subpath entries', () => {
	it('opens a dialog defined by the root entry', async () => {
		await import('../../dist/index.js');
		const { openDialog, uninstallDialogs } = await import('../../dist/components/ui/dialog/index.js');
		await customElements.whenDefined('rui-dialog');

		const dialog = document.createElement('rui-dialog') as HTMLElement & { open: boolean };
		dialog.id = 'root-dialog';
		document.body.append(dialog);
		openDialog('root-dialog');

		expect(dialog.open).toBe(true);
		uninstallDialogs();
		dialog.remove();
	});
});
