import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiField, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiForm } from '@ecopages/radiant-ui/form';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

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
