import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiAvatar } from '../avatar';
import { RuiButton } from '../button';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from './hover-card';
import { RuiHoverCard as RuiHoverCardElement } from './hover-card.script';

const meta = {
	title: 'Components/Hover Card',
	component: RuiHoverCard,
	parameters: {
		radiant: {
			element: RuiHoverCardElement,
			cssImports: [
				'../../../styles/primitives.css',
				'./hover-card.css',
				'../avatar/avatar.css',
				'../button/button.css',
			],
		},
	},
	args: {
		delay: 0,
		closeDelay: 0,
		placement: 'bottom-start',
	},
} satisfies Meta<typeof RuiHoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const getContent = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-hover-card .rui-hover-card__content') as HTMLElement;

export const Default: Story = {
	render: (args) => (
		<RuiHoverCard {...args}>
			<RuiHoverCardTrigger>
				<RuiButton variant="link">Jane Cooper</RuiButton>
			</RuiHoverCardTrigger>
			<RuiHoverCardContent>
				<div class="flex gap-3">
					<RuiAvatar fallback="JC" alt="Jane Cooper" />
					<div class="flex flex-col gap-1">
						<p class="font-medium text-sm">Jane Cooper</p>
						<p class="text-on-surface text-xs opacity-80">Product designer on the Radiant team.</p>
						<p class="text-on-surface text-xs opacity-60">Joined March 2024</p>
					</div>
				</div>
			</RuiHoverCardContent>
		</RuiHoverCard>
	),
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-hover-card') as HTMLElement;
		const content = getContent(canvasElement);
		const trigger = host.querySelector('[data-hover-card-trigger] button') as HTMLButtonElement;

		await step('card starts hidden', async () => {
			await expect(content.hidden).toBe(true);
		});

		await step('pointer enter shows interactive content', async () => {
			host.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
			await expect(content.hidden).toBe(false);
			await expect(content).toHaveAttribute('aria-label', 'Preview');
			await expect(content).toHaveTextContent('Jane Cooper');
		});

		await step('Escape dismisses the card', async () => {
			trigger.focus();
			await userEvent.keyboard('{Escape}');
			await expect(content.hidden).toBe(true);
		});
	},
};

export const Placements: Story = {
	render: (args) => (
		<div class="flex flex-wrap gap-8 p-24">
			<RuiHoverCard {...args} placement="top">
				<RuiHoverCardTrigger>
					<RuiButton variant="outline">top</RuiButton>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>
					<p class="text-sm">Placement: top</p>
				</RuiHoverCardContent>
			</RuiHoverCard>
			<RuiHoverCard {...args} placement="right">
				<RuiHoverCardTrigger>
					<RuiButton variant="outline">right</RuiButton>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>
					<p class="text-sm">Placement: right</p>
				</RuiHoverCardContent>
			</RuiHoverCard>
			<RuiHoverCard {...args} placement="bottom">
				<RuiHoverCardTrigger>
					<RuiButton variant="outline">bottom</RuiButton>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>
					<p class="text-sm">Placement: bottom</p>
				</RuiHoverCardContent>
			</RuiHoverCard>
			<RuiHoverCard {...args} placement="left">
				<RuiHoverCardTrigger>
					<RuiButton variant="outline">left</RuiButton>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>
					<p class="text-sm">Placement: left</p>
				</RuiHoverCardContent>
			</RuiHoverCard>
		</div>
	),
};
