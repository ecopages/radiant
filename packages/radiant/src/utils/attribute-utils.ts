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
 * Utility function to ensure the parsed object is not an array
 */
function ensureObject(parsed: any): object {
  if (typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  throw new TypeError('Parsed value is not a valid object');
}

/**
 * Object that maps attribute types to reader functions.
 * @type {Object.<string, Reader>}
 */
const readers: { [type: string]: Reader } = {
  array(value: string | unknown[]): unknown[] {
    if (Array.isArray(value)) return value;
    const array = parseJSON<unknown[]>(value);
    if (!Array.isArray(array)) {
      throw new TypeError(`Expected an array but got a value of type "${typeof array}"`);
    }
    return array;
  },

  boolean(value: string | boolean): boolean {
    if (typeof value === 'boolean') return value;
    return !(value === '0' || String(value).toLowerCase() === 'false');
  },

  number(value: string | number): number {
    if (typeof value === 'number') return value;
    const number = Number(value.replace(/_/g, ''));
    if (Number.isNaN(number)) {
      throw new TypeError(`Expected a number but got "${value}"`);
    }
    return number;
  },

  object(value: string | object): object {
    if (typeof value === 'string') {
      const parsedObject = parseJSON<object>(value);
      return ensureObject(parsedObject);
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
    throw new TypeError(`Expected an object but got a value of type "${typeof value}"`);
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
