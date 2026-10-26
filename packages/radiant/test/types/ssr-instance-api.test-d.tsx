import { RadiantElement } from '../../src/core/radiant-element';

type Assert<Value extends true> = Value;

type RenderViewToStringIsNotAnInstanceMethod = Assert<'renderViewToString' extends keyof RadiantElement ? false : true>;

export type { RenderViewToStringIsNotAnInstanceMethod };
