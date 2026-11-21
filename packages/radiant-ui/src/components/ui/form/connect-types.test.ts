import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { FormStateStore, FormStateStoreSnapshot } from './form-state-store';
import { RuiForm } from './form.script';
import type { RuiFormFormatError } from './form.script';
import type { FieldError } from './types';

void RuiForm;

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

		expect(form.store).toBe(store);
		expect(typeof form.formatError).toBe('function');
		expect(typeof form.submitHandler).toBe('function');
		expect(typeof form.resetHandler).toBe('function');
	});

	it('accepts an engine store for the plain store property and a formatter of the minimal shape', () => {
		const form = document.createElement('rui-form') as RuiForm;
		const format: RuiFormFormatError = vi.fn(() => '');

		form.store = engineStore();
		form.formatError = format;

		expectTypeOf(engineStore()).toExtend<FormStateStore>();
		expectTypeOf<EngineIssue>().toExtend<FieldError>();
		expect(form.formatError).toBe(format);
	});
});
