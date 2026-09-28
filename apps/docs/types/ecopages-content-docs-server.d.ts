import type { EcoComponent, PageDependenciesResult } from '@ecopages/core';

export declare function getComponent(slug: string): Promise<EcoComponent<Record<string, unknown>>>;
export declare function getEntryDependencies(slug: string): Promise<PageDependenciesResult | undefined>;
