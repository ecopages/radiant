export type AttributeTypeConstant = typeof Array | typeof Boolean | typeof Number | typeof Object | typeof String;

export type AttributeTypeDefault = Array<unknown> | boolean | number | Record<string, unknown> | string;

/**
 * Parses the given attribute type constant and returns its corresponding string representation.
 *
 * @param constant - The attribute type constant to parse.
 * @returns The string representation of the attribute type constant.
 */
export function parseAttributeTypeConstant(constant?: AttributeTypeConstant) {
  switch (constant) {
    case Array:
      return 'array';
    case Boolean:
      return 'boolean';
    case Number:
      return 'number';
    case Object:
      return 'object';
    case String:
      return 'string';
  }
}

/**
 * Parses the attribute type default value and returns its type as a string.
 *
 * @param defaultValue - The default value of the attribute type.
 * @returns The type of the default value as a string.
 */
export function parseAttributeTypeDefault(defaultValue?: AttributeTypeDefault) {
  switch (typeof defaultValue) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
  }

  if (Array.isArray(defaultValue)) return 'array';
  if (Object.prototype.toString.call(defaultValue) === '[object Object]') return 'object';
}

/**
 * Returns the default value for a given attribute type.
 *
 * @param type - The attribute type constant.
 * @returns The default value for the specified attribute type.
 */
export function defaultValueForType(type: AttributeTypeConstant): unknown {
  switch (type) {
    case Number:
      return 0;
    case String:
      return '';
    case Boolean:
      return false;
    default:
      return null;
  }
}

type Reader = (value: string) => number | string | boolean | object | unknown[];

/**
 * Utility function to parse a JSON string safely
 */
function parseJSON<T>(value: string): T {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new TypeError('Invalid JSON string');
  }
}

/**
 * Object that maps attribute types to reader functions.
 * @type {Object.<string, Reader>}
 */
const readers: { [type: string]: Reader } = {
  array(value: string): unknown[] {
    const array = parseJSON<unknown[]>(value);
    if (!Array.isArray(array)) {
      throw new TypeError(`Expected an array but got a value of type "${typeof array}"`);
    }
    return array;
  },

  boolean(value: string): boolean {
    return !(value === '0' || String(value).toLowerCase() === 'false');
  },

  number(value: string): number {
    const number = Number(value.replace(/_/g, ''));
    return number;
  },

  object(value: string): object {
    const object = JSON.parse(value);
    if (object === null || typeof object !== 'object' || Array.isArray(object)) {
      throw new TypeError(
        `expected value of type "object" but instead got value "${value}" of type "${parseAttributeTypeDefault(
          object,
        )}"`,
      );
    }
    return object;
  },

  string(value: string): string {
    return value;
  },
};

type Writer = (value: unknown) => string;

/**
 * Object that maps attribute types to writer functions.
 * @type {Object.<string, Writer>}
 */
const writers: { [type: string]: Writer } = {
  default: writeString,
  array: writeJSON,
  object: writeJSON,
};

function writeJSON(value: unknown) {
  return JSON.stringify(value);
}

function writeString(value: unknown) {
  return `${value}`;
}

/**
 * Reads the attribute value based on the provided type.
 * @param value - The attribute value to be read.
 * @param type - The type of the attribute.
 * @returns The parsed attribute value.
 * @throws {TypeError} If the provided type is unknown.
 */
export function readAttributeValue(value: string, type: AttributeTypeConstant) {
  const readerType = parseAttributeTypeConstant(type);
  if (!readerType) throw new TypeError(`[radiant-element] Unknown type "${type}"`);
  return readers[readerType](value);
}

export type ReadAttributeValueReturnType = ReturnType<typeof readAttributeValue>;

/**
 * Writes the attribute value based on the provided type.
 *
 * @param value - The value to be written.
 * @param type - The type of the attribute.
 * @returns The written attribute value.
 * @throws {TypeError} If the provided type is unknown.
 */
export function writeAttributeValue(value: unknown, type: AttributeTypeConstant) {
  const writerType = parseAttributeTypeConstant(type);
  if (!writerType) throw new TypeError(`[radiant-element] Unknown type "${type}"`);
  return (writers[writerType] || writers.default)(value);
}

export type WriteAttributeValueReturnType = ReturnType<typeof writeAttributeValue>;

/*
 * Type guard functions for each type in AttributeTypeConstant
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArray(value: unknown): value is Array<unknown> {
  return Array.isArray(value);
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

/*
 * Check function to ensure defaultValue matches the type
 */
export function isValueOfType(type: AttributeTypeConstant, defaultValue: unknown): boolean {
  switch (type) {
    case Boolean:
      return isBoolean(defaultValue);
    case Number:
      return isNumber(defaultValue);
    case String:
      return isString(defaultValue);
    case Array:
      return isArray(defaultValue);
    case Object:
      return isObject(defaultValue);
    default:
      return false;
  }
}
