import { RuiButton, type RuiButtonVariant } from '../src/components/ui/button';

export function ToastTrigger({
	label,
	variant = 'filled',
	onClick,
}: {
	label: string;
	variant?: RuiButtonVariant;
	onClick: () => void;
}) {
	return (
		<RuiButton variant={variant} type="button" data-toast-trigger on:click={onClick}>
			{label}
		</RuiButton>
	);
}
