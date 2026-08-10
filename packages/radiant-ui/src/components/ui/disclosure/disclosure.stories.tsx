import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import {
	RuiDisclosure,
	RuiDisclosureGroup,
	RuiDisclosureIcon,
	RuiDisclosurePanel,
	RuiDisclosureTrigger,
} from './disclosure';
import { RuiDisclosure as RuiDisclosureElement } from './disclosure.script';

const meta = {
	title: 'Components/Disclosure',
	component: RuiDisclosure,
	parameters: {
		radiant: { element: RuiDisclosureElement, cssImports: ['./disclosure.css', './disclosure-group.css'] },
	},
	args: {
		trigger: 'More about shipping',
		children: <p>Orders ship within 2 business days via tracked delivery.</p>,
	},
} satisfies Meta<typeof RuiDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

const getTrigger = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('[data-disclosure-trigger]') as HTMLButtonElement;
const getPanel = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-disclosure-panel]') as HTMLElement;
const getTriggers = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('[data-disclosure-trigger]')) as HTMLButtonElement[];

const faqItems = [
	{
		value: 'what',
		title: 'What is radiant-ui?',
		content: <p>A library of accessible light-DOM components.</p>,
	},
	{
		value: 'apg',
		title: 'Is it based on the APG?',
		content: <p>Yes, every widget follows a WAI-ARIA APG pattern.</p>,
	},
	{
		value: 'anywhere',
		title: 'Can I use it anywhere?',
		content: <p>Anywhere custom elements and JSX run.</p>,
	},
];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);
		const panel = getPanel(canvasElement);

		await step('starts collapsed', async () => {
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(panel).toHaveAttribute('hidden');
			await expect(trigger).toHaveTextContent('More about shipping');
		});

		await step('click expands the panel', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(panel).not.toHaveAttribute('hidden');
		});

		await step('click again collapses the panel', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
			await expect(panel).toHaveAttribute('hidden');
		});
	},
};

export const Open: Story = {
	args: { open: true },
	render: (args) => (
		<RuiDisclosure open={args.open} trigger={args.trigger}>
			{args.children}
		</RuiDisclosure>
	),
};

export const Keyboard: Story = {
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);

		await step('Space toggles the disclosure', async () => {
			trigger.focus();
			await userEvent.keyboard(' ');
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});

		await step('Enter toggles the disclosure', async () => {
			await userEvent.keyboard('{Enter}');
			await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const Composed: Story = {
	render: () => (
		<RuiDisclosure>
			<RuiDisclosureTrigger>Composable trigger</RuiDisclosureTrigger>
			<RuiDisclosurePanel>
				<p>Compose trigger and panel with dedicated helpers.</p>
			</RuiDisclosurePanel>
		</RuiDisclosure>
	),
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);

		await step('composed trigger toggles the panel', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
		});
	},
};

export const CustomIcon: Story = {
	render: () => (
		<RuiDisclosureGroup>
			<RuiDisclosure value="details">
				<RuiDisclosureTrigger icon={<RuiDisclosureIcon variant="plus" />} iconPosition="end">
					Order details
				</RuiDisclosureTrigger>
				<RuiDisclosurePanel>
					<p>Plus on the right becomes a close mark when expanded.</p>
				</RuiDisclosurePanel>
			</RuiDisclosure>
		</RuiDisclosureGroup>
	),
	play: async ({ canvasElement, step }) => {
		const trigger = getTrigger(canvasElement);

		await step('custom end icon toggles with the trigger', async () => {
			await userEvent.click(trigger);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(trigger.querySelector('[data-disclosure-icon]')).toBeTruthy();
		});
	},
};

export const FaqGroup: Story = {
	render: () => (
		<RuiDisclosureGroup>
			{faqItems.map((item) => (
				<RuiDisclosure value={item.value}>
					<RuiDisclosureTrigger>{item.title}</RuiDisclosureTrigger>
					<RuiDisclosurePanel>{item.content}</RuiDisclosurePanel>
				</RuiDisclosure>
			))}
		</RuiDisclosureGroup>
	),
	play: async ({ canvasElement, step }) => {
		const triggers = getTriggers(canvasElement);

		await step('clicking a header expands its section', async () => {
			await userEvent.click(triggers[1]);
			await expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
		});

		await step('expanding another section collapses the previous one', async () => {
			await userEvent.click(triggers[0]);
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
			await expect(triggers[1]).toHaveAttribute('aria-expanded', 'false');
		});

		await step('clicking the open header collapses its section', async () => {
			await userEvent.click(triggers[0]);
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const MultipleGroup: Story = {
	render: () => (
		<RuiDisclosureGroup multiple>
			<RuiDisclosure value="billing">
				<RuiDisclosureTrigger>Billing</RuiDisclosureTrigger>
				<RuiDisclosurePanel>
					<p>Invoices are emailed on the first of each month.</p>
				</RuiDisclosurePanel>
			</RuiDisclosure>
			<RuiDisclosure value="support">
				<RuiDisclosureTrigger>Support</RuiDisclosureTrigger>
				<RuiDisclosurePanel>
					<p>Email support@example.com for help.</p>
				</RuiDisclosurePanel>
			</RuiDisclosure>
		</RuiDisclosureGroup>
	),
	play: async ({ canvasElement, step }) => {
		const triggers = getTriggers(canvasElement);

		await step('multiple mode keeps more than one section open', async () => {
			await userEvent.click(triggers[0]);
			await userEvent.click(triggers[1]);
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
			await expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
		});
	},
};

export const AnimatedGroup: Story = {
	render: () => (
		<RuiDisclosureGroup animated>
			{faqItems.map((item) => (
				<RuiDisclosure value={item.value}>
					<RuiDisclosureTrigger>{item.title}</RuiDisclosureTrigger>
					<RuiDisclosurePanel>{item.content}</RuiDisclosurePanel>
				</RuiDisclosure>
			))}
		</RuiDisclosureGroup>
	),
	play: async ({ canvasElement, step }) => {
		const triggers = getTriggers(canvasElement);
		const panel = getPanel(canvasElement);

		await step('animated panels use data-state instead of hidden', async () => {
			await userEvent.click(triggers[0]);
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
			await expect(panel).toHaveAttribute('data-state', 'open');
			await expect(panel).toHaveAttribute('aria-hidden', 'false');
		});
	},
};

export const GroupKeyboardNavigation: Story = {
	render: () => (
		<RuiDisclosureGroup>
			{faqItems.map((item) => (
				<RuiDisclosure value={item.value}>
					<RuiDisclosureTrigger>{item.title}</RuiDisclosureTrigger>
					<RuiDisclosurePanel>{item.content}</RuiDisclosurePanel>
				</RuiDisclosure>
			))}
		</RuiDisclosureGroup>
	),
	play: async ({ canvasElement, step }) => {
		const triggers = getTriggers(canvasElement);

		await step('ArrowDown moves focus to the next header', async () => {
			triggers[0].focus();
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(triggers[1]);
		});

		await step('ArrowUp wraps to the last header', async () => {
			await userEvent.keyboard('{ArrowUp}');
			await expect(document.activeElement).toBe(triggers[0]);
			await userEvent.keyboard('{ArrowUp}');
			await expect(document.activeElement).toBe(triggers[2]);
		});

		await step('Home and End jump to the first and last headers', async () => {
			await userEvent.keyboard('{Home}');
			await expect(document.activeElement).toBe(triggers[0]);
			await userEvent.keyboard('{End}');
			await expect(document.activeElement).toBe(triggers[2]);
		});

		await step('ArrowRight expands and ArrowLeft collapses the focused section', async () => {
			triggers[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
			await userEvent.keyboard('{ArrowLeft}');
			await expect(triggers[0]).toHaveAttribute('aria-expanded', 'false');
		});
	},
};

export const DefaultOpen: Story = {
	render: () => (
		<RuiDisclosureGroup>
			<RuiDisclosure value="open" open>
				<RuiDisclosureTrigger>Expanded by default</RuiDisclosureTrigger>
				<RuiDisclosurePanel>
					<p>This section starts open.</p>
				</RuiDisclosurePanel>
			</RuiDisclosure>
			<RuiDisclosure value="closed">
				<RuiDisclosureTrigger>Collapsed by default</RuiDisclosureTrigger>
				<RuiDisclosurePanel>
					<p>This section starts closed.</p>
				</RuiDisclosurePanel>
			</RuiDisclosure>
		</RuiDisclosureGroup>
	),
};
