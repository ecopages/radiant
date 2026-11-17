import { describe, expect, test } from 'vitest';
import { ReactiveHost } from '../../src/core/reactive-host';

function createHost() {
	return new ReactiveHost({}, { defineProperty: Object.defineProperty }, () => {});
}

describe('the stop function of observeMembers', () => {
	test('does not end an observation that started after it was released', () => {
		const host = createHost();
		const member = host.createReactiveMember('n', 0);
		const seen: number[] = [];
		host.registerUpdateCallback('n', () => seen.push(member.get()));

		const stale = host.observeMembers();
		host.unobserveMembers();
		const current = host.observeMembers();
		stale();
		member.set(1);

		expect(seen).toEqual([1]);
		current();
		member.set(2);
		expect(seen).toEqual([1]);
	});
});

describe('adoptReactiveMember', () => {
	test('returns the existing member and leaves it as it is for an undefined initial value', () => {
		const host = createHost();
		const member = host.createReactiveMember('n', 5);

		expect(host.adoptReactiveMember('n', undefined)).toBe(member);
		expect(member.get()).toBe(5);
	});

	test('initializes an existing member without reporting it while unobserved', () => {
		const host = createHost();
		const member = host.createReactiveMember('n', 5);
		const seen: number[] = [];
		host.registerUpdateCallback('n', () => seen.push(member.get()));

		expect(host.adoptReactiveMember('n', 7)).toBe(member);
		host.observeMembers();

		expect(member.get()).toBe(7);
		expect(seen).toEqual([]);
	});

	test('creates a member when absent', () => {
		const host = createHost();

		expect(host.adoptReactiveMember('n', 3).get()).toBe(3);
	});
});
