import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { expect, userEvent, waitFor } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import { createSortableController } from './sortable-controller';
import { reorder } from './sortable-order';

/**
 * A plain `<ul>` made sortable with `createSortableController`: the host applies the new order and refocuses.
 */
@customElement('rui-sortable-demo')
class SortableDemo extends RadiantElement {
	constructor() {
		super();
		const items = () => [...this.querySelectorAll<HTMLElement>('li')];
		createSortableController(this, {
			getContainer: () => this.querySelector('ul'),
			getItems: items,
			announce: (message) => {
				const status = this.querySelector('[aria-live]');
				if (status) {
					status.textContent = message;
				}
			},
			onChange: ({ item, from, to }) => {
				const list = this.querySelector('ul')!;
				for (const node of reorder(items(), from, to)) {
					list.append(node);
				}
				item.focus();
			},
		});
	}
}

const meta = {
	title: 'Controllers/Sortable',
	parameters: { radiant: { element: SortableDemo } },
	render: () => (
		<rui-sortable-demo>
			<style>{`
				.demo-list { list-style: none; margin: 0; padding: 0; width: 16rem; touch-action: none; user-select: none; }
				.demo-list li { padding: 0.5rem 0.75rem; border: 1px solid #8884; background: #fff; color: #111; position: relative; }
				.demo-list li[data-sortable-state='lifted'] { transform: translate(var(--sortable-dx, 0), var(--sortable-dy, 0)); z-index: 1; box-shadow: 0 2px 8px #0003; }
				.demo-list li[data-sortable-drop='before'] { box-shadow: 0 -2px 0 0 #36f; }
				.demo-list li[data-sortable-drop='after'] { box-shadow: 0 2px 0 0 #36f; }
				.demo-list li:focus-visible { outline: 2px solid #36f; }
			`}</style>
			<ul class="demo-list" aria-label="Fruit">
				<li tabindex="0">Apple</li>
				<li tabindex="0">Banana</li>
				<li tabindex="0">Cherry</li>
				<li tabindex="0">Date</li>
			</ul>
			<p aria-live="polite" data-status />
		</rui-sortable-demo>
	),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const labels = (root: HTMLElement) => [...root.querySelectorAll('li')].map((item) => item.textContent);

export const Default: Story = {
	play: async ({ canvasElement: root, step }) => {
		if (isStaticSsrPreview(root)) return;

		const item = (name: string) => [...root.querySelectorAll('li')].find((li) => li.textContent === name)!;
		const status = root.querySelector('[data-status]') as HTMLElement;

		await step('Space lifts, arrows move and Space drops', async () => {
			item('Apple').focus();
			await userEvent.keyboard(' ');
			await userEvent.keyboard('{ArrowDown}{ArrowDown}');
			await userEvent.keyboard(' ');
			await expect(labels(root)).toEqual(['Banana', 'Cherry', 'Apple', 'Date']);
			await expect(status).toHaveTextContent('Dropped Apple, position 3 of 4.');
			await expect(item('Apple')).toHaveFocus();
		});

		await step('Escape cancels a lift', async () => {
			await userEvent.keyboard(' ');
			await userEvent.keyboard('{ArrowUp}{Escape}');
			await expect(labels(root)).toEqual(['Banana', 'Cherry', 'Apple', 'Date']);
			await expect(status).toHaveTextContent('Cancelled. Apple returned to position 3 of 4.');
		});

		await step('a pointer drag reorders', async () => {
			const date = item('Date').getBoundingClientRect();
			const banana = item('Banana').getBoundingClientRect();
			const y = date.top + date.height / 2;
			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: item('Date'), coords: { clientX: date.left + 20, clientY: y } },
				{ coords: { clientX: banana.left + 20, clientY: banana.top + 2 } },
				{ keys: '[/MouseLeft]' },
			]);
			await waitFor(() => expect(labels(root)).toEqual(['Date', 'Banana', 'Cherry', 'Apple']));
		});
	},
};
