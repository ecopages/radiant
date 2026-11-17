import { setDevWarningsEnabled } from '@ecopages/jsx/jsx-dev-runtime';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { state } from '../../src/decorators/state';

type Variant = 'redundant' | 'direct' | 'bound-only';
type HostKind = 'element' | 'controller';

interface TestHost {
	count: number;
	other: number;
	readonly updateComplete: Promise<void>;
}

interface Mounted {
	host: TestHost;
	/** What the warning names the host as. */
	name: string;
}

let tagCounter = 0;

/**
 * Defines a host class of `kind` whose view reads `count` as `variant` says and never reads `other`.
 *
 * @remarks `redundant` reads `count` directly and binds it with `this.$`, `direct` only reads it directly, and
 * `bound-only` only binds it. Every variant also reads `other` directly; tests that change only `count` must not
 * see `other` named.
 */
function defineHost(kind: HostKind, variant: Variant): () => Promise<Mounted> {
	const view = (host: { count: number; other: number; $: { count: unknown } }) => (
		<div>
			{variant === 'bound-only' ? null : <p>{host.count}</p>}
			{variant === 'direct' ? null : <b>{host.$.count as number}</b>}
			<i>{host.other}</i>
		</div>
	);

	if (kind === 'element') {
		const tag = `render-warnings-${++tagCounter}`;

		@customElement(tag)
		class WarnedElement extends RadiantElement<{ count: number }> {
			@state count = 0;
			@state other = 0;

			override render() {
				return view(this);
			}
		}

		return async () => {
			const host = document.createElement(tag) as WarnedElement;
			document.body.append(host);
			await host.updateComplete;
			return { host, name: `<${tag}>` };
		};
	}

	class WarnedController extends RadiantController<{ count: number }> {
		@state count = 0;
		@state other = 0;

		override render() {
			return view(this);
		}
	}

	return async () => {
		const element = document.createElement('div');
		document.body.append(element);
		const controller = new WarnedController(element);
		controller.connect();
		await controller.updateComplete;
		return { host: controller, name: `WarnedController on <div>` };
	};
}

async function write(host: TestHost, value: number): Promise<void> {
	host.count = value;
	await host.updateComplete;
}

async function writeOther(host: TestHost, value: number): Promise<void> {
	host.other = value;
	await host.updateComplete;
}

describe.each<HostKind>(['element', 'controller'])('whole-render read warnings on a %s host', (kind) => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		setDevWarningsEnabled(undefined);
		vi.useRealTimers();
		vi.restoreAllMocks();
		document.body.innerHTML = '';
	});

	test('a field bound with this.$ and also read in render() warns once, naming the field and the host', async () => {
		const mount = defineHost(kind, 'redundant');
		const { host, name } = await mount();

		await write(host, 1);

		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain(name);
		expect(message).toContain('"count"');
		expect(message).toContain('also reads it in render()');
		expect(message).toContain('this.$.count');
		expect(message).not.toContain('"other"');
	});

	test('the redundant-path warning does not repeat for the same class and field', async () => {
		const mount = defineHost(kind, 'redundant');
		const first = await mount();
		await write(first.host, 1);
		await write(first.host, 2);

		const second = await mount();
		await write(second.host, 1);

		expect(warn).toHaveBeenCalledTimes(1);

		const other = await defineHost(kind, 'redundant')();
		await write(other.host, 1);

		expect(warn).toHaveBeenCalledTimes(2);
		expect(String(warn.mock.calls[1]?.[0])).toContain(other.name);
	});

	test('a field read directly in render() without a binding does not warn', async () => {
		const { host } = await defineHost(kind, 'direct')();

		await write(host, 1);
		await write(host, 2);

		expect(warn).not.toHaveBeenCalled();
	});

	test('a field only bound with this.$ does not warn while a field the view reads re-renders the host', async () => {
		const { host } = await defineHost(kind, 'bound-only')();
		const root = host instanceof HTMLElement ? host : document.body;

		for (let value = 1; value <= 10; value++) {
			await write(host, value);
			await writeOther(host, value);
		}

		expect(root.querySelector('i')?.textContent).toBe('10');
		expect(warn).not.toHaveBeenCalled();
	});

	test('a field that re-runs render() 30 times within a second warns once, naming the field and the host', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		const { host, name } = await defineHost(kind, 'direct')();

		for (let value = 1; value <= 29; value++) {
			await write(host, value);
			vi.advanceTimersByTime(10);
		}
		expect(warn).not.toHaveBeenCalled();

		await write(host, 30);

		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain(name);
		expect(message).toContain('"count"');
		expect(message).toContain('times within');
		expect(message).toContain('this.$.count');
		expect(message).toContain('fills one node or attribute');
		expect(message).toContain('list length');
		expect(message).toContain('out of render()');
		expect(message).toContain('coarser field');
		expect(message).not.toContain('"other"');

		const now = vi.spyOn(Date, 'now');
		for (let value = 31; value <= 60; value++) await write(host, value);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(now).not.toHaveBeenCalled();
	});

	test('each field that re-runs render() 30 times within a second warns once, by name', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		const { host } = await defineHost(kind, 'direct')();

		for (let value = 1; value <= 30; value++) {
			await write(host, value);
			await writeOther(host, value);
		}

		expect(warn).toHaveBeenCalledTimes(2);
		const messages = warn.mock.calls.map((call: unknown[]) => String(call[0]));
		expect(messages.filter((message: string) => message.includes('"count"'))).toHaveLength(1);
		expect(messages.filter((message: string) => message.includes('"other"'))).toHaveLength(1);
	});

	test('the hot-field warning does not repeat for another instance of the same class', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		const mount = defineHost(kind, 'direct');
		const first = await mount();
		const second = await mount();

		for (let value = 1; value <= 30; value++) await write(first.host, value);
		for (let value = 1; value <= 30; value++) await write(second.host, value);

		expect(warn).toHaveBeenCalledTimes(1);
	});

	test('29 re-runs inside a second do not warn', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		const { host } = await defineHost(kind, 'direct')();

		for (let value = 1; value <= 29; value++) await write(host, value);

		expect(warn).not.toHaveBeenCalled();
	});

	test('30 re-runs spread over more than a second do not warn', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		const { host } = await defineHost(kind, 'direct')();

		for (let value = 1; value <= 60; value++) {
			await write(host, value);
			vi.advanceTimersByTime(100);
		}

		expect(warn).not.toHaveBeenCalled();
	});

	test('the development-warning switch silences both warnings', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		setDevWarningsEnabled(false);
		const redundant = await defineHost(kind, 'redundant')();
		const hot = await defineHost(kind, 'direct')();

		await write(redundant.host, 1);
		for (let value = 1; value <= 40; value++) await write(hot.host, value);

		expect(warn).not.toHaveBeenCalled();
	});

	test('a field keeps being counted while warnings are off and warns once they are back on', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(0);
		setDevWarningsEnabled(false);
		const { host } = await defineHost(kind, 'direct')();

		for (let value = 1; value <= 40; value++) await write(host, value);
		expect(warn).not.toHaveBeenCalled();

		setDevWarningsEnabled(undefined);
		await write(host, 41);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]?.[0])).toContain('times within');
	});
});
