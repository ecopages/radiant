import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';

import { HYDRATION_ATTRIBUTE } from '../core/hydration-codec';
import { DEFAULT_SLOT_NAME, SLOT_PROJECTION_SCRIPT_ATTRIBUTE } from '../core/slot-projection-runtime';
import { collectTopLevelHtmlFragments } from './html-parser';

export function parseProjectedSlotRenderablesFromHtml(html: string): Map<string, JsxRenderable[]> {
	const projectedContent = new Map<string, JsxRenderable[]>();

	for (const fragment of collectTopLevelHtmlFragments(html)) {
		if (isIgnoredProjectedHtmlFragment(fragment)) {
			continue;
		}

		appendProjectedRenderable(
			projectedContent,
			getSlotNameFromHtmlFragment(fragment),
			createMarkupNodeLike(fragment),
		);
	}

	return projectedContent;
}

export function collectAuthoredHydrationScriptMarkupFromHtml(html: string): string | undefined {
	const fragments = collectTopLevelHtmlFragments(html).filter((fragment) => isHydrationScriptHtmlFragment(fragment));

	return fragments.length > 0 ? fragments.join('') : undefined;
}

function appendProjectedRenderable(
	projectedContent: Map<string, JsxRenderable[]>,
	slotName: string,
	renderable: JsxRenderable,
): void {
	const existingRenderables = projectedContent.get(slotName);

	if (existingRenderables) {
		existingRenderables.push(renderable);
		return;
	}

	projectedContent.set(slotName, [renderable]);
}

function getSlotNameFromHtmlFragment(fragment: string): string {
	const openingTagMatch = /^<([A-Za-z][^\s/>]*)([^>]*)>/s.exec(fragment);

	if (!openingTagMatch) {
		return DEFAULT_SLOT_NAME;
	}

	const attributes = openingTagMatch[2] ?? '';
	const slotMatch = /\sslot\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes);

	return slotMatch?.[1] ?? slotMatch?.[2] ?? slotMatch?.[3] ?? DEFAULT_SLOT_NAME;
}

function isIgnoredProjectedHtmlFragment(fragment: string): boolean {
	return isSlotProjectionScriptHtmlFragment(fragment) || isHydrationScriptHtmlFragment(fragment);
}

function isSlotProjectionScriptHtmlFragment(fragment: string): boolean {
	const openingTagMatch = /^<script\b([^>]*)>/i.exec(fragment);

	if (!openingTagMatch) {
		return false;
	}

	return hasScriptAttribute(openingTagMatch[1] ?? '', SLOT_PROJECTION_SCRIPT_ATTRIBUTE);
}

function isHydrationScriptHtmlFragment(fragment: string): boolean {
	const openingTagMatch = /^<script\b([^>]*)>/i.exec(fragment);

	if (!openingTagMatch) {
		return false;
	}

	return hasScriptAttribute(openingTagMatch[1] ?? '', HYDRATION_ATTRIBUTE);
}

function hasScriptAttribute(attributes: string, attributeName: string): boolean {
	return new RegExp(`(?:^|\\s)${attributeName}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'i').test(attributes);
}
