import { describe, expect, it } from 'vitest';
import { ListboxHostController } from './listbox-host-controller';

function createOption(value: string, label: string, indicator = false): HTMLElement {
	const option = document.createElement('div');
	option.setAttribute('role', 'option');
	option.setAttribute('data-value', value);
	option.setAttribute('data-label', label);
	option.textContent = label;
	if (indicator) {
		const mark = document.createElement('span');
		mark.setAttribute('data-listbox-option-indicator', '');
		mark.textContent = 'check';
		option.append(mark);
	}
	return option;
}

function createRoot(options: HTMLElement[]) {
	const root = document.createElement('div');
	const host = document.createElement('rui-listbox');
	const listbox = document.createElement('div');
	listbox.setAttribute('role', 'listbox');
	listbox.append(...options);
	host.append(listbox);
	root.append(host);
	return { root, host, listbox };
}

describe('ListboxHostController', () => {
	it('treats the host value as a token array in both selection modes', () => {
		const { root } = createRoot([createOption('draft', 'Draft'), createOption('published', 'Published')]);
		let value = 'draft,published';
		const collection = new ListboxHostController({
			getRoot: () => root,
			getSelectionMode: () => 'single',
			getValue: () => value,
			setValue: (next) => {
				value = next;
			},
		});

		expect(collection.getSelectedValues()).toEqual(['draft', 'published']);
		collection.syncOptionSelection();
		expect(collection.getOptions()[0].getAttribute('aria-selected')).toBe('true');
		expect(collection.getOptions()[1].getAttribute('aria-selected')).toBe('true');
	});

	it('toggles tokens in multiple mode and replaces in single mode', () => {
		const { root } = createRoot([createOption('a', 'A'), createOption('b', 'B')]);
		let value = 'a';
		let mode: 'single' | 'multiple' = 'multiple';
		const collection = new ListboxHostController({
			getRoot: () => root,
			getSelectionMode: () => mode,
			getValue: () => value,
			setValue: (next) => {
				value = next;
			},
		});

		collection.toggleValue('b');
		expect(value).toBe('a,b');
		collection.toggleValue('a');
		expect(value).toBe('b');

		mode = 'single';
		collection.toggleValue('a');
		expect(value).toBe('a');
	});

	it('syncs the embedded listbox host and skips indicator text in labels', () => {
		const { root, host } = createRoot([createOption('cherry', 'Cherry', true)]);
		let value = 'cherry';
		const collection = new ListboxHostController({
			getRoot: () => root,
			getSelectionMode: () => 'multiple',
			getValue: () => value,
			setValue: (next) => {
				value = next;
			},
		});

		collection.syncListboxHost();
		expect((host as HTMLElement & { embedded?: boolean }).embedded).toBe(true);
		expect((host as HTMLElement & { selectionMode?: string }).selectionMode).toBe('multiple');
		expect((host as HTMLElement & { value?: string }).value).toBe('cherry');
		expect(collection.labelForValue('cherry')).toBe('Cherry');
	});

	it('clears and removes values through the host protocol', () => {
		const { root } = createRoot([createOption('a', 'A'), createOption('b', 'B')]);
		let value = 'a,b';
		const collection = new ListboxHostController({
			getRoot: () => root,
			getSelectionMode: () => 'multiple',
			getValue: () => value,
			setValue: (next) => {
				value = next;
			},
		});

		expect(collection.removeValue('a')).toBe(true);
		expect(value).toBe('b');
		expect(collection.removeValue('missing')).toBe(false);
		expect(collection.clearValues()).toBe(true);
		expect(value).toBe('');
		expect(collection.clearValues()).toBe(false);
	});
});
