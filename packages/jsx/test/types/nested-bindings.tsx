import { createSubscribableJsxValue } from '../../src/index';

const binding = createSubscribableJsxValue({
	getValue: () => ({ profile: { name: 'Ada' } }),
	subscribe: () => () => {},
});

const child = <span>{binding.profile.name}</span>;
void child;
// @ts-expect-error The nested profile has no age field.
void binding.profile.age;
