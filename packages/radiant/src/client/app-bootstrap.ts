import type { JsxRenderable } from '@ecopages/jsx';

export type RadiantAppBootstrapContext = {
	documentRoot: Document;
	rootElement: HTMLElement;
	shouldHydrate: boolean;
};

export type RadiantAppBootstrapResult<AppProps> = {
	appProps: AppProps;
	onStarted?: () => void | Promise<void>;
};

export type RadiantAppBootstrap<AppProps> = (
	context: RadiantAppBootstrapContext,
) => void | RadiantAppBootstrapResult<AppProps> | Promise<void | RadiantAppBootstrapResult<AppProps>>;

export async function prepareRadiantApp<AppProps = void>({
	app,
	bootstrap,
	context,
}: {
	app: (props: AppProps) => JsxRenderable;
	bootstrap?: RadiantAppBootstrap<AppProps>;
	context: RadiantAppBootstrapContext;
}): Promise<{ app: JsxRenderable; onStarted?: () => void | Promise<void> }> {
	const bootstrapResult = await bootstrap?.(context);

	return {
		app: app((bootstrapResult?.appProps ?? undefined) as AppProps),
		onStarted: bootstrapResult?.onStarted,
	};
}
