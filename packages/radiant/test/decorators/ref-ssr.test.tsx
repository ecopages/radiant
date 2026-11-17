// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { ref, refAll } from '../../src/decorators/ref';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';

@customElement('ref-ssr-host')
class RefSsrHost extends RadiantElement {
	@ref() menubarRoot!: HTMLElement | null;
	@refAll() item!: HTMLElement[];
}

@customElement('ref-ssr-inner')
class _RefSsrInner extends RadiantElement {}

@customElement('ref-ssr-required-host')
class RefSsrRequiredHost extends RadiantElement {
	@ref({ required: true }) panel!: HTMLElement | null;

	override render() {
		return (
			<div>
				<i data-ref="panel" />
			</div>
		);
	}
}

const part = (name: string) => {
	const node = document.createElement('i');
	node.setAttribute('data-ref', name);
	return node;
};

describe('@ref on the server', () => {
	test('reads null and [] on an empty host', () => {
		const host = new RefSsrHost();

		expect(host.menubarRoot).toBeNull();
		expect(host.item).toEqual([]);
	});

	test('resolves against the DOM shim and leaves out a nested host', () => {
		const host = new RefSsrHost();
		const inner = new _RefSsrInner();
		const innerPart = part('item');
		inner.append(innerPart);
		const root = part('menubar-root');
		const first = part('item');
		const second = part('item');
		host.append(inner, root, first, second);

		expect(host.menubarRoot).toBe(root);
		expect(host.item).toEqual([first, second]);
	});
});

describe('@ref development checks on the server', () => {
	afterEach(() => vi.restoreAllMocks());

	test('do not report a part the host renders itself', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const html = renderRadiantElementHostToString(new RefSsrRequiredHost(), { mode: 'hydrate' });

		expect(html).toContain('data-ref="panel"');
		expect(warn.mock.calls.filter(([message]) => String(message).includes('@ref'))).toEqual([]);
	});
});
