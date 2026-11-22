import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiField, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiForm } from '@ecopages/radiant-ui/form';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { createDemoStore } from './demo-form-store';

export type FormArgs = {
	mode: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
};

export const meta = {
	args: {
		mode: 'onSubmit',
	},
	argTypes: {
		mode: {
			control: { type: 'select' },
			options: [
				'onSubmit',
				'onBlur',
				'onChange',
				'onTouched',
				'all',
			] as const satisfies readonly FormArgs['mode'][],
		},
	},
	render: (args) => (
		<RuiForm mode={args.mode}>
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" placeholder="you@example.com" />
				<RuiFieldError />
			</RuiField>
			<RuiField name="bio" rules={{ minLength: { value: 10, message: 'At least 10 characters' } }}>
				<RuiLabel>Bio</RuiLabel>
				<RuiTextarea placeholder="Tell us about yourself" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Create account</RuiButton>
		</RuiForm>
	),
} satisfies DocsMeta<FormArgs>;

type Story = DocsStory<FormArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'form/default' } } });

export type InjectedFormArgs = Record<string, never>;

/** A form that hands its state to a store it did not create, through `connect`. */
export const injectedMeta = {
	args: {},
	render: () => {
		const store = createDemoStore({
			initial: { profile: { name: '', email: '' } },
			rules: { 'profile.name': (value) => (value ? undefined : 'Name is required') },
		});
		return (
			<RuiForm ref={(form) => (form && typeof form.connect === 'function' ? form.connect(store) : undefined)}>
				<RuiField name="profile.name">
					<RuiLabel>Name</RuiLabel>
					<RuiInput placeholder="Ada Lovelace" />
					<RuiFieldError />
				</RuiField>
				<RuiField name="profile.email">
					<RuiLabel>Email</RuiLabel>
					<RuiInput type="email" required placeholder="you@example.com" />
					<RuiFieldError />
				</RuiField>
				<RuiButton type="submit">Save</RuiButton>
			</RuiForm>
		);
	},
} satisfies DocsMeta<InjectedFormArgs>;

export const Injected: DocsStory<InjectedFormArgs> = docsStory(injectedMeta, {
	parameters: { docs: { id: 'form/injected-store' } },
});
