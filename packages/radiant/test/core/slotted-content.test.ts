import { beforeEach, describe, expect, test } from 'vitest';

import {
	captureSlottedNodes,
	collectAuthoredHydrationScriptMarkup,
	createSlottedTemplateTag,
	serializeSlottedMarkup,
	SLOTTED_ATTRIBUTE,
} from '../../src/core/slotted-content';
import { installLightDomShim } from '../../src/server/light-dom-shim';

describe('slotted content helpers', () => {
	beforeEach(() => {
		installLightDomShim();
	});

	test('serializes captured light-DOM nodes without the server scripts or slotted template', () => {
		const host = document.createElement('div');
		host.innerHTML =
			'<h2 data-note="1 > 0">SSR header</h2>' +
			'<article data-kind="primary"><p>SSR body</p></article>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>' +
			`<template ${SLOTTED_ATTRIBUTE}><p>ignored</p></template>`;

		expect(serializeSlottedMarkup(captureSlottedNodes(host))).toBe(
			'<h2 data-note="1 > 0">SSR header</h2><article data-kind="primary"><p>SSR body</p></article>',
		);
	});

	test('serializes comment nodes as nothing so their data cannot become template markup', () => {
		const host = document.createElement('div');
		host.append(document.createComment('<img src=x onerror=alert(1)>'), document.createTextNode('kept'));

		expect(serializeSlottedMarkup(captureSlottedNodes(host))).toBe('kept');
	});

	test('wraps markup in an inert slotted template, and emits nothing for none', () => {
		expect(createSlottedTemplateTag('<p>a</p>')).toBe(`<template ${SLOTTED_ATTRIBUTE}><p>a</p></template>`);
		expect(createSlottedTemplateTag('')).toBe('');
	});

	test('collects only authored hydration scripts from the host light DOM', () => {
		const hydrationMarkup =
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>';
		const host = document.createElement('div');
		host.innerHTML =
			'<p>SSR body</p>' + hydrationMarkup + `<template ${SLOTTED_ATTRIBUTE}><p>SSR body</p></template>`;

		expect(collectAuthoredHydrationScriptMarkup(host)).toBe(hydrationMarkup);
	});
});
