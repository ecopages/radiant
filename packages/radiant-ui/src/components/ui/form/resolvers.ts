import type { FieldRules, FieldValues, Resolver, ResolverContext, ResolverResult } from './types';

function resolveRuleMessage(
	fallback: string,
	rule: boolean | string | number | RegExp | { value: unknown; message: string } | undefined,
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
	if (!rules) return undefined;
	for (const validator of [validateRequired, validateNumericRange, validateTextRules, validateCustomRules]) {
		const message = await validator(value, rules, values);
		if (message) return message;
	}
	return undefined;
}

function validateRequired(value: unknown, rules: FieldRules): string | undefined {
	const empty =
		value === undefined ||
		value === null ||
		value === '' ||
		value === false ||
		(Array.isArray(value) && value.length === 0);
	return rules.required && empty
		? (resolveRuleMessage('This field is required', rules.required) ?? 'This field is required')
		: undefined;
}

function validateNumericRange(value: unknown, rules: FieldRules): string | undefined {
	const numberValue =
		typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : undefined;
	if (numberValue === undefined || Number.isNaN(numberValue)) return undefined;
	if (rules.min !== undefined && numberValue < ruleValue(rules.min))
		return resolveRuleMessage(`Minimum value is ${ruleValue(rules.min)}`, rules.min);
	if (rules.max !== undefined && numberValue > ruleValue(rules.max))
		return resolveRuleMessage(`Maximum value is ${ruleValue(rules.max)}`, rules.max);
	return undefined;
}

function validateTextRules(value: unknown, rules: FieldRules): string | undefined {
	const text = value == null ? '' : String(value);
	if (rules.minLength !== undefined && text.length < ruleValue(rules.minLength))
		return resolveRuleMessage(`Minimum length is ${ruleValue(rules.minLength)}`, rules.minLength);
	if (rules.maxLength !== undefined && text.length > ruleValue(rules.maxLength))
		return resolveRuleMessage(`Maximum length is ${ruleValue(rules.maxLength)}`, rules.maxLength);
	if (rules.pattern !== undefined && !ruleValue(rules.pattern).test(text))
		return resolveRuleMessage('Invalid format', rules.pattern) ?? 'Invalid format';
	return undefined;
}

async function validateCustomRules(
	value: unknown,
	rules: FieldRules,
	values: FieldValues,
): Promise<string | undefined> {
	if (!rules.validate) return undefined;
	const validators = typeof rules.validate === 'function' ? [rules.validate] : Object.values(rules.validate);
	for (const validate of validators) {
		const result = await validate(value, values);
		if (result !== true && result !== undefined) return result === false ? 'Invalid value' : String(result);
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
