import type { ReactiveBindingOption } from '../../core/reactive-prop-core';
import type { ReactiveHostLike } from '../../core/reactive-host';

type AutoBindHost = ReactiveHostLike & {
	shouldAutoBindReactiveMembers?: () => boolean;
};

export function resolveHostAutoBind(host: AutoBindHost): ReactiveBindingOption {
	return host.shouldAutoBindReactiveMembers?.() ?? false;
}
