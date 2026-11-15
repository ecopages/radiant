import { afterEach, describe, expect, it } from 'vitest';
import { RuiTabs } from './tabs.script';

function settled(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiTabs child observation', () => {
	const tab = (value: string) => {
		const element = document.createElement('button');
		element.setAttribute('role', 'tab');
		element.dataset.tabValue = value;
		return element;
	};
	const panel = (value: string) => {
		const element = document.createElement('div');
		element.setAttribute('role', 'tabpanel');
		element.dataset.tabValue = value;
		return element;
	};

	it('syncs tabs and panels that arrive later, and stops after removal', async () => {
		const host = document.createElement('rui-tabs') as RuiTabs;
		const list = document.createElement('div');
		list.setAttribute('role', 'tablist');
		list.append(tab('a'));
		host.append(list, panel('a'));
		document.body.append(host);
		await settled();

		const late = tab('b');
		const latePanel = panel('b');
		list.append(late);
		host.append(latePanel);
		await settled();
		expect(late.getAttribute('aria-selected')).toBe('false');
		expect(latePanel.hidden).toBe(true);

		host.remove();
		const afterRemoval = tab('c');
		list.append(afterRemoval);
		await settled();
		expect(afterRemoval.hasAttribute('aria-selected')).toBe(false);
	});
});
