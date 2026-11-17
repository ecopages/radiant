const inFlight = new Map<string, Promise<Blob>>();

function download(url: string): Promise<Blob> {
	let pending = inFlight.get(url);
	if (!pending) {
		pending = fetchBlob(url).finally(() => inFlight.delete(url));
		inFlight.set(url, pending);
	}
	return pending;
}

async function fetchBlob(url: string): Promise<Blob> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
	return response.blob();
}

/**
 * Fetches a video into a `Blob` and returns an object URL, for `MediaController`'s `resolveSource`.
 *
 * @remarks
 * A media element can only seek in a file whose server answers range requests, and many development and preview
 * servers (this site's among them) do not: the element then reports nothing seekable and every seek snaps back to
 * the start. The sample clip is about a megabyte, so it is fetched whole and played from memory, which always
 * seeks. For long media serve the file with range support and pass its URL to `load()` without a `resolveSource`.
 * A failed request rejects, which puts the controller in its `error` state; `retry()` calls this again.
 *
 * Requests for a url that is still downloading share one download, and each caller gets an object URL of its own.
 * The page swaps the authoring pattern of a recipe by mounting the new form as soon as the old one is on the page,
 * which would otherwise fetch the clip twice, and a shared object URL would be revoked under the form that is left
 * running when the other releases it. A finished download is not kept, so a retry or a player that is moved asks the
 * server again.
 */
export async function fetchSource(url: string): Promise<string> {
	return URL.createObjectURL(await download(url));
}

/** Frees an object URL `fetchSource` made; `MediaController` calls it as `releaseSource` once the element has let go of it. */
export function releaseSource(url: string): void {
	URL.revokeObjectURL(url);
}
