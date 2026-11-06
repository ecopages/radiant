import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RuiTag, RuiTagGroup, RuiTagList } from './tag-group';
import { RuiTagGroup as RuiTagGroupElement } from './tag-group.script';
void RuiTagGroupElement;

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
			<RuiTagGroup
				tags={[
					{ value: 'ca', label: 'California' },
					{ value: 'tx', label: 'Texas' },
				]}
			/>,
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

	it('gives managed and authored chips an accessible name', async () => {
		const { host, cleanup } = mount(
			<RuiTagGroup
				tags={[
					{ value: 'js', label: 'JavaScript' },
					{ value: 'ts', label: 'TypeScript' },
				]}
			/>,
		);
		await settled();

		const group = host.querySelector('rui-tag-group') as RuiTagGroupElement;
		const authoredTags = Array.from(host.querySelectorAll<HTMLElement>('[data-tag-list] [data-tag]'));
		expect(authoredTags.map((tag) => tag.getAttribute('aria-label'))).toEqual(['JavaScript', 'TypeScript']);

		group.setItems([{ value: 'rs', label: 'Rust' }]);
		await settled();

		const managed = host.querySelector('[data-rui-managed-list]') as HTMLElement;
		expect(managed.querySelector('[data-tag]')?.getAttribute('aria-label')).toBe('Rust');
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

	describe('when disabled', () => {
		async function mountDisabled() {
			const mounted = mount(
				<RuiTagGroup value={['imprinted']} disabled>
					<RuiTagList>
						<RuiTag value="imprinted" label="Imprinted">
							Imprinted
						</RuiTag>
					</RuiTagList>
				</RuiTagGroup>,
			);
			await settled();
			const group = mounted.host.querySelector('rui-tag-group') as RuiTagGroupElement;
			const events: string[] = [];
			group.addEventListener('rui-remove', () => events.push('rui-remove'));
			group.addEventListener('rui-change', () => events.push('rui-change'));
			return { ...mounted, group, events };
		}

		it('does not remove a tag when the remove control is clicked', async () => {
			const { host, group, events, cleanup } = await mountDisabled();

			host.querySelector<HTMLElement>('[data-tag-remove]')!.click();
			await settled();

			expect(events).toEqual([]);
			expect(group.value).toEqual(['imprinted']);
			cleanup();
		});

		it.each(['Delete', 'Backspace'])('does not remove a tag on %s', async (key) => {
			const { host, group, events, cleanup } = await mountDisabled();

			host.querySelector<HTMLElement>('[data-tag]')!.dispatchEvent(
				new KeyboardEvent('keydown', { key, bubbles: true }),
			);
			await settled();

			expect(events).toEqual([]);
			expect(group.value).toEqual(['imprinted']);
			cleanup();
		});

		it('disables the remove control and re-enables it with the group', async () => {
			const { host, group, cleanup } = await mountDisabled();
			const button = host.querySelector<HTMLButtonElement>('[data-tag-remove]')!;

			expect(button.disabled).toBe(true);

			group.disabled = false;
			await settled();
			expect(button.disabled).toBe(false);
			cleanup();
		});

		it.each(['Delete', 'Backspace'])('does not prevent default on %s', async (key) => {
			const { host, cleanup } = await mountDisabled();
			const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

			host.querySelector<HTMLElement>('[data-tag]')!.dispatchEvent(event);

			expect(event.defaultPrevented).toBe(false);
			cleanup();
		});
	});

	describe('with an aria-disabled tag', () => {
		async function mountWithDisabledTag() {
			const mounted = mount(
				<RuiTagGroup value={['imprinted', 'tamed']}>
					<RuiTagList>
						<RuiTag value="imprinted" label="Imprinted">
							Imprinted
						</RuiTag>
						<RuiTag value="tamed" label="Tamed" disabled>
							Tamed
						</RuiTag>
					</RuiTagList>
				</RuiTagGroup>,
			);
			await settled();
			const group = mounted.host.querySelector('rui-tag-group') as RuiTagGroupElement;
			const tamed = mounted.host.querySelector<HTMLElement>('[data-value="tamed"]')!;
			const events: string[] = [];
			group.addEventListener('rui-remove', () => events.push('rui-remove'));
			return { ...mounted, group, tamed, events };
		}

		it('does not remove the tag when its remove control is clicked', async () => {
			const { group, tamed, events, cleanup } = await mountWithDisabledTag();
			const remove = tamed.querySelector<HTMLButtonElement>('[data-tag-remove]')!;
			expect(remove.disabled).toBe(true);

			remove.click();
			await settled();

			expect(events).toEqual([]);
			expect(group.value).toEqual(['imprinted', 'tamed']);
			cleanup();
		});

		it.each(['Delete', 'Backspace'])('ignores %s without preventing default', async (key) => {
			const { group, tamed, events, cleanup } = await mountWithDisabledTag();
			const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

			tamed.dispatchEvent(event);
			await settled();

			expect(events).toEqual([]);
			expect(group.value).toEqual(['imprinted', 'tamed']);
			expect(event.defaultPrevented).toBe(false);
			cleanup();
		});

		it('still removes an enabled tag', async () => {
			const { host, group, events, cleanup } = await mountWithDisabledTag();
			const imprinted = host.querySelector<HTMLElement>('[data-value="imprinted"]')!;

			imprinted.querySelector<HTMLElement>('[data-tag-remove]')!.click();
			await settled();

			expect(events).toEqual(['rui-remove']);
			expect(group.value).toEqual(['tamed']);
			cleanup();
		});
	});
});
