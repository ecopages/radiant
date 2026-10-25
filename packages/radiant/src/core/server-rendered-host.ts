/**
 * Attribute that hydrate-mode SSR stamps on every Radiant host it serializes.
 *
 * @remarks Hydration markers only exist where a view has bindings, and custom-element JSX children carry none, so
 * a host cannot tell from markers whether its content came from the server. This attribute can. It is read once, at
 * first connect, into `RadiantElement#isServerRendered` and then removed, as hydration markers are, so it
 * only ever means that a host has not connected yet.
 */
export const SERVER_RENDERED_HOST_ATTRIBUTE = 'data-radiant-ssr';

/**
 * Value of {@link SERVER_RENDERED_HOST_ATTRIBUTE} on a host whose children the server rendered from the view of the
 * host around it, as a children value.
 *
 * @remarks The client gets those children back only when that parent hydrates, which can happen after the host's
 * own first connect when the host's tag was defined first. Such a host hydrates once its children arrive.
 */
export const SERVER_RENDERED_CHILDREN_STAMP = 'children';

/**
 * Value of {@link SERVER_RENDERED_HOST_ATTRIBUTE} on a host the server rendered with Authored Children that fill a
 * named slot, which it ships in a slot-projection payload.
 *
 * @remarks Such a host keeps those children on the client for its lifetime: a view that hydrates over it, such as
 * the page's JSX, hands it the same children as a value, which would put them all in the default slot, so it ignores
 * it. A host whose children only fill the default slot is not stamped this way: the value renders them in the same
 * place and keeps their bindings live.
 */
export const SERVER_RENDERED_AUTHORED_STAMP = 'authored';
