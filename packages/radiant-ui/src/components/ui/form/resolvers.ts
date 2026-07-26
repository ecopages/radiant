import type { FieldRules, FieldValues, Resolver, ResolverContext, ResolverResult } from './types';

function resolveRuleMessage(
	fallback: string,
	rule: boolean | string | number | { value: unknown; message: string } | undefined,
): string | undefined {
	if (rule === undefined || rule === false) {
		return undefined;
	}
	if (typeof rule === 'string') {
		return rule;
	}
	if (typeof rule === 'object' && rule !== null && 'message' in rule && typeof rule.message === 'string') {
		return rule.message;
	}
	return fallback;
}

function ruleValue<T>(rule: T | { value: T; message: string }): T {
	if (typeof rule === 'object' && rule !== null && 'value' in rule) {
		return rule.value as T;
	}
	return rule as T;
}

async function validateFieldRules(
	_valueName: string,
	value: unknown,
	rules: FieldRules | undefined,
	values: FieldValues,
): Promise<string | undefined> {
	if (!rules) {
		return undefined;
	}

	if (rules.required) {
		const empty =
			value === undefined ||
			value === null ||
			value === '' ||
			(Array.isArray(value) && value.length === 0) ||
			value === false;
		if (empty) {
			return resolveRuleMessage('This field is required', rules.required) ?? 'This field is required';
		}
	}

	if (typeof value === 'number' || (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value)))) {
		const num = typeof value === 'number' ? value : Number(value);
		if (rules.min !== undefined && num < ruleValue(rules.min)) {
			return resolveRuleMessage(`Minimum value is ${ruleValue(rules.min)}`, rules.min);
		}
		if (rules.max !== undefined && num > ruleValue(rules.max)) {
			return resolveRuleMessage(`Maximum value is ${ruleValue(rules.max)}`, rules.max);
		}
	}

	const str = value == null ? '' : String(value);
	if (rules.minLength !== undefined && str.length < ruleValue(rules.minLength)) {
		return resolveRuleMessage(`Minimum length is ${ruleValue(rules.minLength)}`, rules.minLength);
	}
	if (rules.maxLength !== undefined && str.length > ruleValue(rules.maxLength)) {
		return resolveRuleMessage(`Maximum length is ${ruleValue(rules.maxLength)}`, rules.maxLength);
	}
	if (rules.pattern !== undefined) {
		const pattern = ruleValue(rules.pattern);
		if (!pattern.test(str)) {
			const patternRule = rules.pattern;
			const message =
				typeof patternRule === 'object' && 'message' in patternRule && typeof patternRule.message === 'string'
					? patternRule.message
					: 'Invalid format';
			return message;
		}
	}

	if (rules.validate) {
		if (typeof rules.validate === 'function') {
			const result = await rules.validate(value, values);
			if (result === true || result === undefined) {
				return undefined;
			}
			if (result === false) {
				return 'Invalid value';
			}
			return String(result);
		}

		for (const key of Object.keys(rules.validate)) {
			const fn = rules.validate[key];
			const result = await fn(value, values);
			if (result !== true && result !== undefined) {
				return result === false ? 'Invalid value' : String(result);
			}
		}
	}

	return undefined;
}

export async function runRulesResolver<T extends FieldValues>(
	values: T,
	context: ResolverContext,
	names?: string[],
): Promise<ResolverResult<T>> {
	const targetNames = names ?? Object.keys(context.fields);
	const errors: Partial<Record<keyof T, { type: string; message: string }>> = {};

	for (const name of targetNames) {
		const rules = context.fields[name]?.rules;
		const message = await validateFieldRules(name, values[name], rules, values);
		if (message) {
			errors[name as keyof T] = { type: 'validation', message };
		}
	}

	if (Object.keys(errors).length > 0) {
		return { values: {} as Record<string, never>, errors };
	}

	return { values, errors: {} as Record<string, never> };
}

export function createRulesResolver<T extends FieldValues>(): Resolver<T> {
	return (values, context, options) => runRulesResolver(values, context, options.names);
}
