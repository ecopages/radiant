import { describe, expect, test } from 'vitest';
import {
  defaultValueForType,
  getInitialValue,
  parseAttributeTypeConstant,
  parseAttributeTypeDefault,
  readAttributeValue,
  writeAttributeValue,
} from '../../src/utils/attribute-utils';

describe('readAttributeValue', async () => {
  test.each([
    ['true', true],
    ['1', true],
    ['0', false],
  ])('%s should be parsed as %s', (a, b) => {
    const read = readAttributeValue(a, Boolean);
    expect(read).toBe(b);
  });

  test.each([
    ['1', 1],
    ['1_000', 1000],
    ['1_000_000', 1000000],
  ])('%s should be parsed as %i', (a, b) => {
    const read = readAttributeValue(a, Number);
    expect(read).toBe(b);
  });

  test.each([
    ['hello', 'hello'],
    ['', ''],
  ])('%s should be parsed as %s', (a, b) => {
    const read = readAttributeValue(a, String);
    expect(read).toBe(b);
  });

  test.each([
    ['{"hello":"world"}', { hello: 'world' }],
    ['{}', {}],
  ])('%j should be parsed as %o', (a, b) => {
    const read = readAttributeValue(a, Object);
    expect(read).toEqual(b);
  });

  test.each([
    ['["hello","world"]', ['hello', 'world']],
    ['[]', []],
  ])('%j should be parsed as %o', (a, b) => {
    const read = readAttributeValue(a, Array);
    expect(read).toEqual(b);
  });

  test.each([
    [1, Array],
    [1, Object],
    ['1', Array],
    ['1', Object],
    [{}, Number],
    [[], Number],
  ])('%s should throw %s', (a, b) => {
    const read = () => readAttributeValue(a as any, b);
    expect(read).toThrow();
  });
});

describe('writeAttributeValue', async () => {
  test.each([
    [true, 'true'],
    [false, 'false'],
  ])('%s should be written as %s', (a, b) => {
    const write = writeAttributeValue(a, Boolean);
    expect(write).toBe(b);
  });

  test.each([
    [1, '1'],
    [1000, '1000'],
    [1000000, '1000000'],
  ])('%i should be written as %s', (a, b) => {
    const write = writeAttributeValue(a, Number);
    expect(write).toBe(b);
  });

  test.each([
    ['hello', 'hello'],
    ['', ''],
  ])('%s should be written as %s', (a, b) => {
    const write = writeAttributeValue(a, String);
    expect(write).toBe(b);
  });

  test.each([
    [{ hello: 'world' }, '{"hello":"world"}'],
    [{}, '{}'],
  ])('%o should be written as %j', (a, b) => {
    const write = writeAttributeValue(a, Object);
    expect(write).toBe(b);
  });

  test.each([
    [['hello', 'world'], '["hello","world"]'],
    [[], '[]'],
  ])('%o should be written as %j', (a, b) => {
    const write = writeAttributeValue(a, Array);
    expect(write).toBe(b);
  });
});

describe('parseAttributeTypeDefault', async () => {
  test.each([
    [true, 'boolean'],
    [1, 'number'],
    ['hello', 'string'],
    [{ hello: 'world' }, 'object'],
    [['hello', 'world'], 'array'],
  ])('%s should be parsed as %s', (a, b) => {
    const parsed = parseAttributeTypeDefault(a);
    expect(parsed).toBe(b);
  });
});

describe('parseAttributeTypeConstant', async () => {
  test.each([
    [Boolean, 'boolean'],
    [Number, 'number'],
    [String, 'string'],
    [Object, 'object'],
    [Array, 'array'],
  ])('%o should be parsed as %s', (a, b) => {
    const parsed = parseAttributeTypeConstant(a);
    expect(parsed).toBe(b);
  });
});

describe('defaultValueForType', async () => {
  test.each([
    [Boolean, false],
    [Number, 0],
    [String, ''],
    [Object, null],
    [Array, null],
  ])('%o should be parsed as %s', (a, b) => {
    const parsed = defaultValueForType(a);
    expect(parsed).toBe(b);
  });
});

describe('getInitialValue defaults', () => {
  test.each([
    [Boolean, 'value', false],
    [Number, 'value', 0],
    [String, 'value', ''],
    [Object, 'value', null],
    [Array, 'value', null],
  ])('should parse type %o as default value %s', (type, attributeKey, defaultValue) => {
    const radiantElement = document.createElement('radiant-counter') as any;
    const parsed = getInitialValue(radiantElement, type, attributeKey, defaultValue);
    expect(parsed).toBe(defaultValue);
  });
});

describe('getInitialValue with attribute', () => {
  test.each([
    [Boolean, 'value', 'true', true],
    [Number, 'value', '1', 1],
    [String, 'value', 'hello', 'hello'],
    [Object, 'value', '{"hello":"world"}', { hello: 'world' }],
    [Array, 'value', '["hello","world"]', ['hello', 'world']],
  ])('should parse attribute type %o with value %s as %s', (type, attributeKey, attributeValue, expectedValue) => {
    const radiantElement = document.createElement('radiant-counter') as any;
    radiantElement.setAttribute(attributeKey, attributeValue);
    const parsed = getInitialValue(radiantElement, type, attributeKey, null);
    expect(parsed).toEqual(expectedValue);
  });
});
