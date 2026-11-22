import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { FormStateStore, FormStateStoreSnapshot } from './form-state-store';
import { RuiForm } from './form.script';
import { RuiField } from '../field/field.script';
import type { RuiFormFormatError } from './form.script';
import type { FieldError } from './types';

void RuiForm;
void RuiField;

/** An engine-like issue: more than `FieldError`, with a narrower `source`. */
type EngineIssue = {
	type: string;
	source: 'server' | 'validation' | 'native';
	ruleId?: string;
	params?: Record<string, unknown>;
	message?: string;
	all: Array<{ type: string; message?: string }>;
};

function engineStore(): FormStateStore<EngineIssue> {
	const snapshot: FormStateStoreSnapshot<EngineIssue> = { values: {}, errors: {}, warnings: {} };
	return {
		getValue: () => undefined,
		setValue() {},
		blur() {},
		getSnapshot: () => snapshot,
		subscribe: () => () => {},
		reset() {},
		async validate() {
			return true;
		},
		reportNative() {},
	};
}

describe('typed connect', () => {
	it('infers the formatter issue from the store without a cast', () => {
		const form = document.createElement('rui-form') as RuiForm;
		const store = engineStore();

		form.connect(store, {
			formatError: (issue, field) => {
				expectTypeOf(issue).toEqualTypeOf<EngineIssue>();
				expectTypeOf(field).toEqualTypeOf<{ path: string }>();
				return `${issue.ruleId ?? issue.source}:${field.path}`;
			},
			submitHandler: ({ store: given }) => {
				expectTypeOf(given).toEqualTypeOf<FormStateStore<EngineIssue>>();
			},
			resetHandler: ({ store: given }) => {
				expectTypeOf(given).toEqualTypeOf<FormStateStore<EngineIssue>>();
			},
		});

		expect(form).toBeDefined();
	});

	it('formats an issue through the binding with the own issue type of the store', async () => {
		const issue: EngineIssue = { type: 'min', source: 'server', ruleId: 'r1', params: { min: 3 }, all: [] };
		const store: FormStateStore<EngineIssue> = {
			...engineStore(),
			getSnapshot: () => ({ values: { x: '' }, errors: { x: issue }, warnings: {} }),
			getValue: () => '',
		};
		const form = document.createElement('rui-form') as RuiForm;
		const nativeForm = document.createElement('form');
		nativeForm.setAttribute('data-ref', 'form');
		const field = document.createElement('rui-field') as HTMLElement & { name: string };
		field.name = 'x';
		field.innerHTML = '<input data-rui-control /><p data-rui-field-error hidden></p>';
		nativeForm.append(field);
		form.append(nativeForm);
		document.body.append(form);
		const seen: Array<[string, string]> = [];

		form.connect(store, {
			formatError: (given, { path }) => {
				seen.push([given.ruleId ?? '', path]);
				return `at least ${given.params?.min}`;
			},
		});
		await customElements.whenDefined('rui-field');
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(field.querySelector('[data-rui-field-error]')?.textContent).toBe('at least 3');
		expect(seen[0]).toEqual(['r1', 'x']);
		form.remove();
	});

	it('connects an engine store with a formatter of the minimal shape and returns a disposer', () => {
		const form = document.createElement('rui-form') as RuiForm;
		const format: RuiFormFormatError = vi.fn(() => '');

		const disconnect = form.connect(engineStore(), { formatError: format });

		expectTypeOf(disconnect).toEqualTypeOf<() => void>();
		expectTypeOf(engineStore()).toExtend<FormStateStore>();
		expectTypeOf<EngineIssue>().toExtend<FieldError>();
		disconnect();
	});

	it('has no plain properties for a store or its handlers', () => {
		const form = document.createElement('rui-form') as RuiForm;

		// @ts-expect-error a store is injected through connect only
		form.store = engineStore();
		// @ts-expect-error a submit handler is passed to connect
		form.submitHandler = () => {};
		// @ts-expect-error a reset handler is passed to connect
		form.resetHandler = () => {};

		expect(form).toBeDefined();
	});

	it('rejects a formatter for a different issue type, so there is no cast path', () => {
		const form = document.createElement('rui-form') as RuiForm;
		type OtherIssue = { type: string; code: number };

		// @ts-expect-error the formatter takes OtherIssue, which the store's issues are not
		form.connect(engineStore(), { formatError: (issue: OtherIssue) => String(issue.code) });
		// @ts-expect-error a handler for another store's issue type does not connect either
		form.connect(engineStore(), {
			submitHandler: ({ store }: { store: FormStateStore<OtherIssue> }) => void store,
		});

		expect(form).toBeDefined();
	});
});
