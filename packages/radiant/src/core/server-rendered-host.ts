/**
 * Attribute that hydrate-mode SSR stamps on every Radiant host it serializes.
 *
 * @remarks Hydration markers only exist where a view has bindings, and custom-element JSX children carry none, so
 * a host cannot tell from markers whether its content came from the server. This attribute can. It is read once, at
 * first connect, into {@link RadiantElement.isServerRendered}.
 */
export const SERVER_RENDERED_HOST_ATTRIBUTE = 'data-radiant-ssr';
