import { RadiantController, controller } from '@ecopages/radiant';
import { stopControllers } from '@ecopages/radiant/controller-registry';
import { afterEach, describe, expect, it } from 'vitest';
import { startControllersOnce } from './start-controllers-once';

const connected: string[] = [];

@controller('start-once-probe')
export class StartOnceProbe extends RadiantController {
	override connect(): void {
		super.connect();
		connected.push('connect');
	}
}

describe('startControllersOnce', () => {
	afterEach(() => {
		stopControllers();
		Reflect.deleteProperty(document, Symbol.for('radiant-ui-docs:controller-runtime'));
		document.body.innerHTML = '';
		connected.length = 0;
	});

	it('returns the same runtime on every call', () => {
		expect(startControllersOnce(document)).toBe(startControllersOnce(document));
	});

	it('connects a host once however often it is called, and again when a module evaluation starts over', async () => {
		document.body.innerHTML = '<div data-controller="start-once-probe"></div>';
		startControllersOnce(document);
		startControllersOnce(document);
		const again = './start-controllers-once?again';
		const reevaluated = (await import(/* @vite-ignore */ again)) as typeof import('./start-controllers-once');
		reevaluated.startControllersOnce(document);

		expect(connected).toEqual(['connect']);
	});
});
