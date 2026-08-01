// @vitest-environment happy-dom
import '../../src/server/install-ssr-runtime';
import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';

describe('RadiantElement SSR boolean host attributes', () => {
	test('serializes typed boolean false for decorator props', () => {
		@customElement('server-host-boolean-override-test')
		class ServerHostBooleanOverride extends RadiantElement {
			@prop({ type: Boolean, defaultValue: true }) enabled!: boolean;

			override render() {
				return <p>{String(this.enabled)}</p>;
			}
		}

		const element = new ServerHostBooleanOverride();
		element.enabled = false;

		expect(renderRadiantElementHostToString(element)).toBe(
			'<server-host-boolean-override-test enabled="false"><p>false</p></server-host-boolean-override-test>',
		);
	});

	test('serializes typed boolean false from createReactiveProp alone', () => {
		@customElement('server-host-boolean-imperative-test')
		class ServerHostBooleanImperative extends RadiantElement {
			enabled!: boolean;

			constructor() {
				super();
				this.createReactiveProp('enabled', { type: Boolean, defaultValue: true });
			}

			override render() {
				return <p>{String(this.enabled)}</p>;
			}
		}

		const element = new ServerHostBooleanImperative();
		element.enabled = false;

		expect(renderRadiantElementHostToString(element)).toBe(
			'<server-host-boolean-imperative-test enabled="false"><p>false</p></server-host-boolean-imperative-test>',
		);
	});

	test('serializes boolean false even when the declared default is false', () => {
		@customElement('server-host-boolean-false-default-test')
		class ServerHostBooleanFalseDefault extends RadiantElement {
			@prop({ type: Boolean, defaultValue: false }) enabled!: boolean;

			override render() {
				return <p>{String(this.enabled)}</p>;
			}
		}

		const element = new ServerHostBooleanFalseDefault();

		expect(renderRadiantElementHostToString(element)).toBe(
			'<server-host-boolean-false-default-test enabled="false"><p>false</p></server-host-boolean-false-default-test>',
		);
	});
});
