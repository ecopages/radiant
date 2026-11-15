import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mountExample } from '../primitive-example/mount-example';
import './recipe-patterns.script';

const STORAGE_KEY = 'radiant-ui-docs:recipe-pattern';
const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 0));

const events: string[] = [];

class ProbeElement extends HTMLElement {
	connectedCallback(): void {
		events.push(`connect:${this.dataset.name}`);
	}

	disconnectedCallback(): void {
		events.push(`disconnect:${this.dataset.name}`);
	}
}
customElements.define('recipe-pattern-probe', ProbeElement);

const panel = (id: string) =>
	`<div data-pattern-panel="${id}"><recipe-pattern-probe data-name="${id}">${id}</recipe-pattern-probe></div>`;

function mount(patterns: string[]): HTMLElement {
	const host = document.createElement('recipe-patterns');
	host.dataset.pattern = patterns[0];
	host.innerHTML = `<div role="toolbar">${patterns
		.map((id) => `<button data-pattern-button="${id}">${id}</button>`)
		.join('')}</div>
		<div data-pattern-stage>${panel(patterns[0])}</div>
		${patterns.map((id) => `<template data-pattern-template="${id}">${panel(id)}</template>`).join('')}`;
	document.body.append(host);
	return host;
}

const shown = (host: HTMLElement) =>
	[...host.querySelectorAll('[data-pattern-stage] [data-pattern-panel]')].map(
		(node) => (node as HTMLElement).dataset.patternPanel,
	);
const pressed = (host: HTMLElement) =>
	[...host.querySelectorAll<HTMLElement>('[aria-pressed="true"]')].map((button) => button.dataset.patternButton);

describe('recipe-patterns', () => {
	beforeEach(() => {
		localStorage.removeItem(STORAGE_KEY);
		events.length = 0;
	});
	afterEach(() => {
		document.body.innerHTML = '';
		localStorage.removeItem(STORAGE_KEY);
	});

	it('keeps the server-rendered first pattern when nothing is stored', async () => {
		const host = mount(['element', 'plain']);
		await waitForUpdate();

		expect(shown(host)).toEqual(['element']);
		expect(pressed(host)).toEqual(['element']);
	});

	it('shows the stored pattern and leaves the first one out of the document', async () => {
		localStorage.setItem(STORAGE_KEY, 'plain');
		const host = mount(['element', 'plain']);
		await waitForUpdate();

		expect(shown(host)).toEqual(['plain']);
		expect(pressed(host)).toEqual(['plain']);
		expect(events).toEqual(['connect:element', 'disconnect:element', 'connect:plain']);
	});

	it('destroys the old pattern and starts the new one when the reader picks another, and stores the choice', async () => {
		const host = mount(['element', 'plain']);
		await waitForUpdate();
		events.length = 0;

		host.querySelector<HTMLElement>('[data-pattern-button="plain"]')!.click();

		expect(events).toEqual(['disconnect:element', 'connect:plain']);
		expect(shown(host)).toEqual(['plain']);
		expect(host.querySelectorAll('recipe-pattern-probe')).toHaveLength(1);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('plain');

		host.querySelector<HTMLElement>('[data-pattern-button="element"]')!.click();

		expect(shown(host)).toEqual(['element']);
		expect(events.slice(-2)).toEqual(['disconnect:plain', 'connect:element']);
	});

	it('does nothing when the pressed pattern is picked again', async () => {
		const host = mount(['element', 'plain']);
		await waitForUpdate();
		events.length = 0;

		host.querySelector<HTMLElement>('[data-pattern-button="element"]')!.click();

		expect(events).toEqual([]);
	});

	it('keeps the first pattern, and the stored choice, when the page lacks the stored one', async () => {
		localStorage.setItem(STORAGE_KEY, 'controller');
		const host = mount(['element', 'plain']);
		await waitForUpdate();

		expect(shown(host)).toEqual(['element']);
		expect(localStorage.getItem(STORAGE_KEY)).toBe('controller');
	});

	it('runs the cleanup of a plain example when the reader switches away from it', async () => {
		const cleaned: string[] = [];
		mountExample('recipe-pattern-plain', () => () => cleaned.push('plain'));
		localStorage.setItem(STORAGE_KEY, 'plain');
		const host = mount(['element', 'plain']);
		host.querySelector('template[data-pattern-template="plain"]')!.innerHTML =
			'<div data-pattern-panel="plain"><div data-example="recipe-pattern-plain"></div></div>';
		await waitForUpdate();
		host.querySelector<HTMLElement>('[data-pattern-button="element"]')!.click();
		await waitForUpdate();

		expect(shown(host)).toEqual(['element']);
		expect(cleaned).toEqual(['plain']);
	});
});
