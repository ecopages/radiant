import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiKnob } from './knob';
import { RuiKnob as RuiKnobElement } from './knob.script';

const meta = {
	title: 'Components/Knob',
	component: RuiKnob,
	parameters: { radiant: { element: RuiKnobElement, cssImports: ['./knob.css'] } },
	args: { label: 'Gain', value: 50, min: 0, max: 100, step: 1, name: 'gain' },
} satisfies Meta<typeof RuiKnob>;

export default meta;
type Story = StoryObj<typeof meta>;

const getControl = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-knob [role="slider"]') as HTMLButtonElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-knob') as HTMLElement;
		const control = getControl(canvasElement);

		await step('renders the configured accessible value', async () => {
			await expect(control).toHaveAttribute('aria-valuenow', '50');
			await expect(canvasElement.querySelector('.rui-knob__value')).toHaveTextContent('50');
		});

		await step('arrow keys update the value and emit rui-change', async () => {
			const emissions: number[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: number }>).detail.value),
			);
			control.focus();
			await userEvent.keyboard('{ArrowRight}{PageUp}');
			await expect(host).toHaveAttribute('value', '61');
			await expect(control).toHaveAttribute('aria-valuenow', '61');
			await expect(emissions).toEqual([51, 61]);
		});
	},
};

export const ReadOnly: Story = {
	render: () => <RuiKnob label="Gain" value={50} min={0} max={100} step={1} readOnly />,
	play: async ({ canvasElement, step }) => {
		await step('remains focusable without accepting keyboard changes', async () => {
			const host = canvasElement.querySelector('rui-knob') as HTMLElement;
			const control = getControl(canvasElement);
			await expect(control).toHaveAttribute('aria-readonly', 'true');
			control.focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(control).toHaveFocus();
			await expect(host).toHaveAttribute('value', '50');
		});
	},
};

export const HiddenValue: Story = {
	args: { showValue: false, valueTemplate: '{value} dB' },
};

export const ValueBelow: Story = {
	args: { valuePosition: 'below', valueTemplate: '{value} dB' },
	play: async ({ canvasElement, step }) => {
		await step('renders its value after the knob button', async () => {
			const root = canvasElement.querySelector('.rui-knob') as HTMLElement;
			const value = canvasElement.querySelector('.rui-knob__value--below') as HTMLElement;
			await expect(root).toHaveClass('rui-knob--value-below');
			await expect(value).toHaveClass('rui-knob__value--below');
			await expect(value).toHaveTextContent('50 dB');
		});
	},
};

export const Compact: Story = {
	args: { size: 30 },
	play: async ({ canvasElement, step }) => {
		await step('uses the explicit size for the visible ring while preserving a 44px target', async () => {
			const host = canvasElement.querySelector('rui-knob') as HTMLElement;
			const control = getControl(canvasElement);
			const svg = canvasElement.querySelector('.rui-knob__svg') as SVGSVGElement;

			await expect(host.style.getPropertyValue('--rui-knob-size')).toBe('30px');
			await expect(getComputedStyle(svg).inlineSize).toBe('30px');
			await expect(getComputedStyle(control).inlineSize).toBe('44px');
		});
	},
};
