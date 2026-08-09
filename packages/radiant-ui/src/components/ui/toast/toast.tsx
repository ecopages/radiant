import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiToastProps } from './toast.script';
import './toast.script';

import type { RuiToasterProps } from './toaster.script';
import './toaster.script';

export type RuiToastViewProps = JsxHtmlProps<RuiToastProps & { slot?: string }>;

export function RuiToast({
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
}: RuiToastViewProps) {
	return (
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
	);
}

export type RuiToasterViewProps = JsxHtmlPropsWithChildren<RuiToasterProps & { slot?: string }>;

export function RuiToaster({
	children,
	position,
	duration,
	visibleToasts,
	closeButton,
	expand,
	gap,
	offset,
	container,
	...props
}: RuiToasterViewProps) {
	return (
		<rui-toaster
			{...props}
			prop:position={position}
			prop:duration={duration}
			prop:visibleToasts={visibleToasts}
			prop:closeButton={closeButton}
			prop:expand={expand}
			prop:gap={gap}
			prop:offset={offset}
			prop:container={container}
		>
			{children}
		</rui-toaster>
	);
}
