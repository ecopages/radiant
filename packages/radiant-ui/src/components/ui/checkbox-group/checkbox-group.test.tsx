import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { RuiCheckbox } from '../checkbox';
import { RuiCheckbox as RuiCheckboxElement } from '../checkbox/checkbox.script';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from './checkbox-group';
import { RuiCheckboxGroup as RuiCheckboxGroupElement } from './checkbox-group.script';
void RuiCheckboxElement;
void RuiCheckboxGroupElement;

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-checkbox-group');
	await customElements.whenDefined('rui-checkbox');
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

describe('RuiCheckboxGroup programmatic writes', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('ignores a programmatic checked write on a child until the group value changes', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		createRoot(host).render(
			<RuiCheckboxGroup value={['news']} name="topics" label="Topics">
				<RuiCheckboxGroupControl>
					<RuiCheckbox value="news">News</RuiCheckbox>
					<RuiCheckbox value="travel">Travel</RuiCheckbox>
				</RuiCheckboxGroupControl>
			</RuiCheckboxGroup>,
		);
		await settled();

		const group = host.querySelector('rui-checkbox-group') as RuiCheckboxGroupElement;
		const [news, travel] = [...host.querySelectorAll('rui-checkbox')] as RuiCheckboxElement[];
		const changes: unknown[] = [];
		group.addEventListener('rui-change', (event) => changes.push((event as CustomEvent).detail));

		travel.checked = true;
		await settled();
		expect(group.value).toEqual(['news']);
		expect(changes).toEqual([]);

		group.value = ['news', 'travel'];
		await settled();
		expect(news.checked).toBe(true);
		expect(travel.checked).toBe(true);
	});
});
