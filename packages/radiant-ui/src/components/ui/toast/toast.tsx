import type { WithChildren, RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiToastProps } from './toast.script';
import { RuiToast as RuiToastElement } from './toast.script';
import type { RuiToasterProps } from './toaster.script';
import { RuiToaster as RuiToasterElement } from './toaster.script';
import './toast.css';

export type RuiToastViewProps = RuiToastProps & RadiantSlotProps;

export const RuiToast = defineRadiantView(
	RuiToastElement,
	({
		slot,
		toastId,
		title,
		description,
		variant,
		duration,
		dismissible,
		closeButton,
		actionLabel,
		position,
		markedDelete,
	}: RuiToastViewProps) => (
		<rui-toast
			slot={slot}
			prop:toastId={toastId != null ? String(toastId) : undefined}
			prop:title={title}
			prop:description={description}
			prop:variant={variant}
			prop:duration={duration}
			prop:dismissible={dismissible}
			prop:closeButton={closeButton}
			prop:actionLabel={actionLabel}
			prop:position={position}
			prop:markedDelete={markedDelete}
		/>
	),
);

export type RuiToasterViewProps = WithChildren<RuiToasterProps & RadiantSlotProps>;

export const RuiToaster = defineRadiantView(
	RuiToasterElement,
	({ slot, position, duration, visibleToasts, closeButton, expand, gap, offset, children }: RuiToasterViewProps) => (
		<rui-toaster
			slot={slot}
			prop:position={position}
			prop:duration={duration}
			prop:visibleToasts={visibleToasts}
			prop:closeButton={closeButton}
			prop:expand={expand}
			prop:gap={gap}
			prop:offset={offset}
		>
			{children}
		</rui-toaster>
	),
);
