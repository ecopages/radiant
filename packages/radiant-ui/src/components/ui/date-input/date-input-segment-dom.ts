import { cx } from '@/lib/cx';
import {
	getSegmentBounds,
	segmentAriaName,
	segmentDisplayText,
	segmentNumericValue,
	type DatePartType,
	type DateSegmentModel,
} from '@/lib/intl-date';

type SegmentDomPropsContext = {
	disabled: boolean;
	locale: string | string[] | undefined;
	readOnly: boolean;
	segments: DateSegmentModel[];
	useTextboxRole: boolean;
};

/** DOM attributes for one editable `rui-date-input` segment span. */
export function getSegmentDomProps(segment: DateSegmentModel, context: SegmentDomPropsContext) {
	const type = segment.type as DatePartType;
	const numeric = segmentNumericValue(segment);
	const spinbutton = !context.useTextboxRole;
	const ariaRole = spinbutton ? 'spinbutton' : 'textbox';
	const editable = !context.disabled && !context.readOnly;
	const bounds = getSegmentBounds(type, context.segments);

	return {
		ariaLabel: segmentAriaName(type, context.locale),
		ariaReadonly: context.readOnly || undefined,
		ariaRole,
		ariaValuemax: spinbutton ? bounds.max : undefined,
		ariaValuemin: spinbutton ? bounds.min : undefined,
		ariaValuenow: spinbutton && numeric != null ? numeric : undefined,
		ariaValuetext: spinbutton ? segmentDisplayText(segment) : undefined,
		className: cx('rui-date-input__segment', segment.isPlaceholder && 'rui-date-input__segment--placeholder'),
		contenteditable: editable ? 'true' : undefined,
		inputmode: editable ? 'numeric' : undefined,
		suppresscontenteditablewarning: editable ? 'true' : undefined,
		tabindex: context.disabled ? undefined : 0,
	};
}
