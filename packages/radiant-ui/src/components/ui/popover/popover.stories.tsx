import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiButton } from '../button';
import { RuiCheckbox } from '../checkbox';
import { RuiPopover, RuiPopoverContent, RuiPopoverTrigger } from './popover';
import { RuiPopover as RuiPopoverElement } from './popover.script';

const meta = {
	title: 'Components/Popover',
	component: RuiPopover,
	parameters: { radiant: { element: RuiPopoverElement, cssImports: ['./popover.css'] } },
} satisfies Meta<typeof RuiPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTriggerWrapper: Story = {
	render: () => (
		<RuiPopoverTrigger trigger={<RuiButton variant="outline">Extras</RuiButton>}>
			<RuiPopover placement="bottom-start">
				<RuiPopoverContent class="flex flex-col gap-3 p-2">
					<RuiCheckbox checked>Pickle</RuiCheckbox>
					<RuiCheckbox checked>Ham</RuiCheckbox>
					<RuiCheckbox>Cheese</RuiCheckbox>
				</RuiPopoverContent>
			</RuiPopover>
		</RuiPopoverTrigger>
	),
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-popover-trigger') as HTMLElement;
		const trigger = canvasElement.querySelector('[slot="trigger"] button') as HTMLButtonElement;
		const surface = document.querySelector('.rui-popover') as HTMLElement;

		await step('starts closed', async () => {
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(surface).toHaveAttribute('hidden');
		});

		await step('click opens the popover', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(surface).not.toHaveAttribute('hidden');
			await expect(surface).toHaveAttribute('data-placement');
		});

		await step('escape closes the popover', async () => {
			await userEvent.keyboard('{Escape}');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(surface).toHaveAttribute('hidden');
		});

		await step('reopen and outside click closes', async () => {
			await userEvent.click(trigger);
			await userEvent.click(document.body);
			await expect((host as HTMLElement & { open?: boolean }).open).toBe(false);
		});
	},
};

export const StandaloneWithAnchor: Story = {
	render: () => (
		<div class="flex items-center gap-4">
			<span id="popover-anchor">
				<RuiButton variant="outline">Anchor</RuiButton>
			</span>
			<RuiPopover anchor="#popover-anchor" portal>
				<RuiPopoverContent class="p-2">Positioned relative to the anchor button.</RuiPopoverContent>
			</RuiPopover>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		const anchor = canvasElement.querySelector('#popover-anchor button') as HTMLButtonElement;
		const surface = document.querySelector('.rui-popover') as HTMLElement;

		await step('starts closed', async () => {
			await expect(anchor).toHaveAttribute('aria-expanded', 'false');
			await expect(surface).toHaveAttribute('hidden');
		});

		await step('anchor click opens the popover', async () => {
			await userEvent.click(anchor);
			await expect(anchor).toHaveAttribute('aria-expanded', 'true');
			await expect(surface).not.toHaveAttribute('hidden');
			await expect(surface).toHaveAttribute('data-placement');
		});

		await step('escape closes the popover', async () => {
			await userEvent.keyboard('{Escape}');
			await expect(anchor).toHaveAttribute('aria-expanded', 'false');
			await expect(surface).toHaveAttribute('hidden');
		});
	},
};
