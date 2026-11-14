import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiTabs } from './tabs.script';

function settled(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiTabs child observation', () => {
	it('resyncs when children change and stops after removal', async () => {
		const host = document.createElement('rui-tabs') as RuiTabs;
		document.body.append(host);
		await settled();
		const resync = vi.spyOn(host, 'resync');

		host.append(document.createElement('span'));
		await settled();
		expect(resync).toHaveBeenCalledTimes(1);

		host.remove();
		host.append(document.createElement('span'));
		await settled();
		expect(resync).toHaveBeenCalledTimes(1);
	});
});
