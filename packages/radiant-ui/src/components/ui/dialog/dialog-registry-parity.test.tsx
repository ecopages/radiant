import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRoot } from '@ecopages/jsx';
import { RuiDialog, installDialogs, openDialog, uninstallDialogs } from './index';
import { RuiDialog as RuiDialogScript } from './dialog.script';
void RuiDialogScript;

type StructureNode = {
	tag: string;
	ref: string | null;
	classes: string[];
	role: string | null;
	ariaModal: string | null;
	ariaLabel: string | null;
	tabindex: string | null;
	dataAttributes: string[];
	children: StructureNode[];
};

/**
 * Structure that must match between the view and the registry. Visibility
 * (`hidden`), generated ids and text are intentionally left out.
 */
function describeStructure(element: Element): StructureNode {
	return {
		tag: element.tagName.toLowerCase(),
		ref: element.getAttribute('data-ref'),
		classes: [...element.classList].sort(),
		role: element.getAttribute('role'),
		ariaModal: element.getAttribute('aria-modal'),
		ariaLabel: element.getAttribute('aria-label'),
		tabindex: element.getAttribute('tabindex'),
		dataAttributes: element
			.getAttributeNames()
			.filter((name) => name.startsWith('data-') && name !== 'data-ref')
			.sort(),
		children: [...element.children].map(describeStructure),
	};
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await customElements.whenDefined('rui-dialog');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function surfaceOf(dialog: Element): Element {
	const root = dialog.querySelector('[data-ref="root"]');
	if (!root) {
		throw new Error('Expected dialog root');
	}
	return root;
}

describe.each([false, true])('dialog registry parity (alert=%s)', (alert) => {
	afterEach(() => {
		uninstallDialogs();
	});

	it('builds the same structure as DialogShell', async () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const root: JsxRoot = createRoot(host);
		root.render(
			<RuiDialog
				id="parity-view"
				open
				alert={alert}
				title="Title"
				actions={
					<>
						<button
							type="button"
							class="rui-button rui-button--outline rui-button--sm"
							data-dialog-action="no"
						>
							No
						</button>
						<button
							type="button"
							class="rui-button rui-button--filled rui-button--md"
							data-dialog-action="yes"
						>
							Yes
						</button>
					</>
				}
			>
				<p>Body</p>
			</RuiDialog>,
		);
		await settled();

		installDialogs();
		openDialog({
			alert,
			title: 'Title',
			body: 'Body',
			actions: [
				{ label: 'No', value: 'no', variant: 'outline', size: 'sm' },
				{ label: 'Yes', value: 'yes' },
			],
		});
		await settled();

		const viewDialog = host.querySelector('#parity-view');
		const registryDialog = document.querySelector('rui-dialog:not(#parity-view)');
		if (!viewDialog || !registryDialog) {
			throw new Error('Expected both dialogs');
		}

		const viewStructure = describeStructure(surfaceOf(viewDialog));
		const registryStructure = describeStructure(surfaceOf(registryDialog));
		expect(JSON.stringify(viewStructure)).toContain('data-dialog-actions');
		expect(registryStructure).toEqual(viewStructure);

		root.unmount();
		host.remove();
	});
});
