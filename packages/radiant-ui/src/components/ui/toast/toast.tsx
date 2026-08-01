import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiToastProps } from './toast.script';
import { RuiToast as RuiToastElement } from './toast.script';
import type { RuiToasterProps } from './toaster.script';
import { RuiToaster as RuiToasterElement } from './toaster.script';

export type RuiToastViewProps = JsxHtmlProps<RuiToastProps & { slot?: string }>;

export const RuiToast = defineRadiantView(
	RuiToastElement,
	({
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
		...props
	}: RuiToastViewProps) => (
		<rui-toast
			{...props}
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
	{ stylesheets: ['./toast.css'] },
);

export type RuiToasterViewProps = JsxHtmlPropsWithChildren<RuiToasterProps & { slot?: string }>;

export const RuiToaster = defineRadiantView(
	RuiToasterElement,
	({
		children,
		position,
		duration,
		visibleToasts,
		closeButton,
		expand,
		gap,
		offset,
		...props
	}: RuiToasterViewProps) => (
		<rui-toaster
			{...props}
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
	{ stylesheets: ['./toast.css'] },
);
