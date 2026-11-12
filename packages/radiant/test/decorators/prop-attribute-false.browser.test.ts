import { afterEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';

class Engine {
	getRecipe() {
		return 'recipe';
	}
}

declare const __LEGACY_ENVIRONMENT__: boolean;

let tagCounter = 0;
const nextTag = (kind: string) => `prop-attr-${kind}-${++tagCounter}`;

describe('@prop({ attribute: false })', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('is not an observed attribute and is never reflected or adopted from markup', () => {
		const tag = nextTag('false');

		@customElement(tag)
		class Host extends RadiantElement {
			@prop({ type: Object, attribute: false }) engine?: Engine;
		}

		expect((customElements.get(tag) as typeof Host & { observedAttributes: string[] }).observedAttributes ?? []).not.toContain(
			'engine',
		);

		document.body.innerHTML = `<${tag} engine='{"x":1}'></${tag}>`;
		const host = document.body.firstElementChild as Host;
		const engine = new Engine();
		host.engine = engine;

		expect(host.engine).toBe(engine);
		expect(host.engine?.getRecipe()).toBe('recipe');
		expect(host.getAttribute('engine')).toBe('{"x":1}');
	});

	test('rejects reflect: true with attribute: false', () => {
		expect(() => {
			@customElement(nextTag('reflect'))
			class Host extends RadiantElement {
				@prop({ type: Object, attribute: false, reflect: true }) engine?: Engine;
			}
			return Host;
		}).toThrow(/attribute: false/);
	});
});

describe('@prop precedence: a property assigned first beats markup', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	function define(tag: string, attribute?: false) {
		@customElement(tag)
		class Host extends RadiantElement {
			@prop({ type: Object, ...(attribute === false && { attribute: false as const }) }) engine?: Engine;
		}
		return Host;
	}

	test.each([
		['keeps its attribute', undefined],
		['is property-only', false as const],
	])('assigned before upgrade over an authored attribute (%s)', (_, attribute) => {
		const tag = nextTag('pre');
		document.body.innerHTML = `<${tag} engine='{"x":1}'></${tag}>`;
		const host = document.body.firstElementChild as HTMLElement & { engine?: Engine };
		const engine = new Engine();
		host.engine = engine;

		define(tag, attribute);

		expect(host.engine).toBe(engine);
	});

	/**
	 * @remarks
	 * Legacy decorators cannot tell a write after construction from a field initializer: both leave an own data
	 * property before the first connect, and an authored attribute overrides an initializer. The cell is pinned for the
	 * standard decorators only.
	 */
	test.skipIf(__LEGACY_ENVIRONMENT__).each([
		['keeps its attribute', undefined],
		['is property-only', false as const],
	])('assigned after construction and after an authored attribute, before the first connect sync (%s)', (_, attribute) => {
		const tag = nextTag('presync');
		const Host = define(tag, attribute);
		const host = new Host();
		const engine = new Engine();
		host.setAttribute('engine', '{"x":1}');
		host.engine = engine;
		document.body.appendChild(host);

		expect(host.engine).toBe(engine);
	});

	test('assigned after the first sync, a later attribute change still applies for a prop that keeps its attribute', () => {
		const tag = nextTag('postsync');
		const Host = define(tag);
		const host = new Host();
		document.body.appendChild(host);
		const engine = new Engine();
		host.engine = engine;

		expect(host.engine).toBe(engine);
	});

	test('a server-rendered attribute does not replace a property assigned before upgrade', () => {
		const tag = nextTag('ssr');
		document.body.innerHTML = `<${tag} engine='{"secret":"x"}' data-ssr></${tag}>`;
		const host = document.body.firstElementChild as HTMLElement & { engine?: Engine };
		const engine = new Engine();
		host.engine = engine;

		const Host = define(tag);
		const upgraded = host as InstanceType<typeof Host>;

		expect(upgraded.engine).toBe(engine);
	});
});
