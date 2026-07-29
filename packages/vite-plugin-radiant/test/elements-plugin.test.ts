import { describe, expect, test } from 'vitest';
import { radiantElements } from '../src/elements';
import { getResolvedRadiantVirtualModule } from '../src/elements/shared';

describe('radiantElements virtual modules', () => {
	test('generates registry modules for configured globs', async () => {
		const plugin = radiantElements({ componentDirectory: 'src/components' });
		const resolvedId = plugin.resolveId?.('virtual:radiant/components');
		expect(resolvedId).toBe(getResolvedRadiantVirtualModule('components'));

		const componentsModule = plugin.load?.(resolvedId!);
		expect(componentsModule).toContain('import.meta.glob');
		expect(componentsModule).toContain('/src/components/');

		const assetRegistryId = plugin.resolveId?.('virtual:radiant/ssr-asset-registry');
		const assetRegistryModule = plugin.load?.(assetRegistryId!);
		expect(assetRegistryModule).toContain('resolveRadiantSsrStyleAsset');
	});
});
