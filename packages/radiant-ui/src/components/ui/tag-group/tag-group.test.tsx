import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiTag, RuiTagGroup, RuiTagList } from './tag-group';
import type { RuiTagGroup as RuiTagGroupElement } from './tag-group.script';
import './tag-group.script';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-tag-group');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('RuiTagGroup', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('leaves authored tags in place until setItems takes over', async () => {
		const { host, cleanup } = mount(
			<RuiTagGroup tags={[{ value: 'ca', label: 'California' }, { value: 'tx', label: 'Texas' }]} />,
		);
		await settled();

		const group = host.querySelector('rui-tag-group') as RuiTagGroupElement;
		const authored = host.querySelector('[data-tag-list]:not([data-rui-managed-list])') as HTMLElement;
		expect(authored.hidden).toBe(false);
		expect(host.querySelector('[data-rui-managed-list]')).toBeNull();
		expect(host.querySelectorAll('[data-tag]')).toHaveLength(2);

		group.setItems([{ value: 'ny', label: 'New York' }]);
		await settled();

		expect(authored.hidden).toBe(true);
		const managed = host.querySelector('[data-rui-managed-list]') as HTMLElement;
		expect(managed).toBeTruthy();
		expect(managed.querySelector('[data-tag]')?.getAttribute('data-value')).toBe('ny');
		expect(managed.querySelectorAll('[data-tag]')).toHaveLength(1);
		cleanup();
	});

	it('does not remove an empty authored list when setItems has never run', async () => {
		const { host, cleanup } = mount(
			<RuiTagGroup>
				<RuiTagList />
			</RuiTagGroup>,
		);
		await settled();

		expect(host.querySelector('[data-tag-list]')).toBeTruthy();
		expect(host.querySelector('[data-rui-managed-list]')).toBeNull();
		cleanup();
	});

	it('removes the derived list when setItems receives an empty collection', async () => {
		const { host, cleanup } = mount(
			<RuiTagGroup>
				<RuiTagList>
					<RuiTag value="ca" label="California">
						California
					</RuiTag>
				</RuiTagList>
			</RuiTagGroup>,
		);
		await settled();

		const group = host.querySelector('rui-tag-group') as RuiTagGroupElement;
		group.setItems([{ value: 'ny', label: 'New York' }]);
		await settled();
		expect(host.querySelector('[data-rui-managed-list]')).toBeTruthy();

		group.setItems([]);
		await settled();
		expect(host.querySelector('[data-rui-managed-list]')).toBeNull();
		expect((host.querySelector('[data-tag-list]:not([data-rui-managed-list])') as HTMLElement).hidden).toBe(true);
		cleanup();
	});
});
