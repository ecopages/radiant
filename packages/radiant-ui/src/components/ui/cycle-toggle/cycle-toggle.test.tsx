import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiCycleToggle, RuiCycleToggleItem } from './cycle-toggle';
import { RuiCycleToggle as RuiCycleToggleElement } from './cycle-toggle.script';

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await tick();
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('RuiCycleToggle hydration', () => {
	it('keeps an SSR ghost variant after the host upgrades', async () => {
		document.body.innerHTML = `
			<rui-cycle-toggle value="system" variant="ghost" size="sm" label="Theme">
				<button class="rui-button rui-cycle-toggle__button rui-button--ghost rui-button--sm" type="button" data-cycle-toggle-button>
					<span class="rui-cycle-toggle__item" data-cycle-value="system">System</span>
					<span class="rui-cycle-toggle__item" data-cycle-value="light" hidden>Light</span>
					<span class="rui-cycle-toggle__item" data-cycle-value="dark" hidden>Dark</span>
				</button>
			</rui-cycle-toggle>
		`;

		await customElements.whenDefined('rui-cycle-toggle');
		await settled();

		const host = document.querySelector('rui-cycle-toggle') as RuiCycleToggleElement;
		const button = document.querySelector('[data-cycle-toggle-button]');

		expect(host.variant).toBe('ghost');
		expect(button?.className).toContain('rui-button--ghost');
		expect(button?.className).not.toContain('rui-button--filled');
	});

	it('keeps a client-rendered ghost variant after connect', async () => {
		const mount = document.createElement('div');
		document.body.append(mount);
		const root = createRoot(mount);

		root.render(
			<RuiCycleToggle value="system" label="Theme" variant="ghost" size="sm">
				<RuiCycleToggleItem id="system" selected>
					System
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="light" selected={false}>
					Light
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="dark" selected={false}>
					Dark
				</RuiCycleToggleItem>
			</RuiCycleToggle>,
		);

		await customElements.whenDefined('rui-cycle-toggle');
		await settled();

		const host = mount.querySelector('rui-cycle-toggle') as RuiCycleToggleElement;
		const button = mount.querySelector('[data-cycle-toggle-button]');

		expect(host.variant).toBe('ghost');
		expect(button?.className).toContain('rui-button--ghost');
		expect(button?.className).not.toContain('rui-button--filled');
	});
});
