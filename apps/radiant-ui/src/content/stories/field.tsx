import { RuiField, RuiFieldDescription, RuiFieldError, RuiFieldWarning } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiForm } from '@ecopages/radiant-ui/form';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { createDemoStore } from './demo-form-store';

export type FieldArgs = {
	name: string;
	disabled: boolean;
	invalid: boolean;
	error: string;
};

export const meta = {
	args: {
		name: 'email',
		disabled: false,
		invalid: false,
		error: '',
	},
	argTypes: {
		name: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		invalid: { control: { type: 'boolean' } },
		error: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiField name={args.name} disabled={args.disabled} invalid={args.invalid} error={args.error || undefined}>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" placeholder="you@example.com" />
			<RuiFieldDescription>We will never share your email.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
} satisfies DocsMeta<FieldArgs>;

type Story = DocsStory<FieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'field/default' } } });

export type FieldWarningArgs = Record<string, never>;

/** A warning from an injected store: advice that shows beside the control and never blocks. */
export const warningMeta = {
	args: {},
	render: () => {
		const store = createDemoStore({
			initial: { password: 'letmein' },
			warnings: {
				password: (value) =>
					String(value ?? '').length < 12 ? 'Longer passwords are harder to guess' : undefined,
			},
		});
		return (
			<RuiForm ref={(form) => (form && typeof form.connect === 'function' ? form.connect(store) : undefined)}>
				<RuiField name="password">
					<RuiLabel>Password</RuiLabel>
					<RuiInput type="password" />
					<RuiFieldError />
					<RuiFieldWarning />
				</RuiField>
			</RuiForm>
		);
	},
} satisfies DocsMeta<FieldWarningArgs>;

export const WithWarning: DocsStory<FieldWarningArgs> = docsStory(warningMeta, {
	parameters: { docs: { id: 'field/with-warning' } },
});
