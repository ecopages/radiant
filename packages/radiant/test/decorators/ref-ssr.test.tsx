// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { ref, refAll } from '../../src/decorators/ref';

@customElement('ref-ssr-host')
class RefSsrHost extends RadiantElement {
	@ref() menubarRoot!: HTMLElement | null;
	@refAll() item!: HTMLElement[];
}

@customElement('ref-ssr-inner')
class _RefSsrInner extends RadiantElement {}

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
