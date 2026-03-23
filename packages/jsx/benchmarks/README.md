# JSX Benchmarking Notes

## Current Benchmark Harness

There is now a local server-render benchmark that aligns its default page shape with the published Kita `RealWorldPage` benchmark.

Run it with:

```bash
cd packages/jsx
bun run bench:server
```

`bench:server` now measures the same two SSR tasks under both runtimes and then prints a direct comparison table:

- `renderToString`
- `renderToString hydrate`

Under the hood the comparer runs the same measurement script twice:

- once with Bun
- once with Node via `tsx`

That matters because the question we actually care about is per task: how does Bun compare with Node for the same `renderToString(...)` workload?

If you want the raw single-runtime numbers without the cross-runtime table, use:

```bash
cd packages/jsx
bun run bench:server:bun
bun run bench:server:node
```

Use the focused hydrate profiler when you want to isolate marker-heavy overhead instead of the full page benchmark:

```bash
cd packages/jsx
bun run profile:hydrate
```

It measures the shared `RealWorldPage(name, purchases)` workload with:

- a full document layout (`html`, `head`, `body`)
- the same purchase-card tree shape used by the Kita benchmark suite
- `1,000` purchases by default

The first task, `renderToString`, is the directly comparable metric.

The second task, `renderToString hydrate`, is intentionally extra. It keeps the same page shape but includes Radiant hydration markers, so it should be treated as a framework-specific extension rather than a published-like comparison number.

The comparison runner validates that both runtimes serialize the same number of output bytes before reporting the timing delta, so the table only compares equivalent work.

## Current SSR Optimizations

The benchmark now exercises two server-render hot-path optimizations that also benefit normal JSX SSR usage:

- template interpolation metadata is cached per static template shape instead of reparsing binding syntax on every render
- HTML escaping uses `Bun.escapeHTML(...)` on Bun and a portable fast-path fallback on other runtimes

These changes target algorithmic overhead in the renderer rather than only changing benchmark data.

## Benchmark Runner Choice

The server benchmark now uses a small explicit timing harness instead of a benchmark framework.

- the same warmup and iteration counts run under both Bun and Node
- the runner reports average microseconds per iteration for each SSR task
- the comparer prints the runtime winner and the relative delta for each task

This is a better fit for the current goal than a framework-oriented per-process benchmark report, because it answers the actual question directly: `renderToString` Bun vs Node, and `renderToString hydrate` Bun vs Node.

## Example Output

Typical comparison output looks like this:

```text
RealWorldPage output size: 169.1 KiB
Comparing identical renderToString workloads across Bun and Node. Lower avgUs is better.

┌─────────┬──────────────────────────┬──────────┬───────────┬──────────────────────────────────────────────┬────────┐
│ (index) │ benchmark                │ bunAvgUs │ nodeAvgUs │ delta                                        │ winner │
├─────────┼──────────────────────────┼──────────┼───────────┼──────────────────────────────────────────────┼────────┤
│ 0       │ renderToString           │ 516.18   │ 603.42    │ Bun 1.17x faster (14.5% less time)           │ Bun    │
│ 1       │ renderToString hydrate   │ 2370.00  │ 2551.74   │ Bun 1.08x faster (7.1% less time)            │ Bun    │
└─────────┴──────────────────────────┴──────────┴───────────┴──────────────────────────────────────────────┴────────┘
```

Read it like this:

- `renderToString` is the comparable server-render result
- `renderToString hydrate` includes extra SSR marker output and is only meaningful as an internal regression signal
- `winner` tells you which runtime completed the same task faster
- `delta` tells you the relative speed gap for that exact task

## Current Rendering Behavior

The current client renderer is not doing Lit-style incremental DOM updates.

- `render(...)` replaces the target subtree with `target.replaceChildren(...)`.
- There is no keyed reconciliation layer.
- There is no memoization of child subtrees across renders.
- `hydrate(...)` is incremental only for the first SSR pass: it attaches event and property bindings onto existing DOM without replacing nodes.
- After hydration, subsequent `render(...)` calls rebuild the subtree again.

The relevant implementation is in [dom-render.ts](../dom-render.ts).

That means list updates currently behave closer to a full remount strategy than to Lit's `TemplateInstance` + part update model.

## What Lit Does Differently

Lit keeps a compiled template structure and updates only the dynamic parts.

- Static DOM is created once per template shape.
- Dynamic text, attributes, and child parts are patched in place.
- Repeated collections can get keyed behavior when using directives such as `repeat(...)` with stable keys.

Our current runtime does not have an equivalent structure yet.

## Evidence In This Repo

The test [dom-render-reconciliation.test.tsx](../test/dom-render-reconciliation.test.tsx) proves that rerendering the same list creates new `<li>` nodes instead of preserving identity.

That is the first thing to improve before expecting strong results in list-heavy benchmarks.

## Recommended Benchmark Plan

### 1. Local correctness + shape checks

- Keep the reconciliation behavior test in place.
- Add follow-up tests for row selection, row removal, and row swap once a benchmark implementation exists.

### 2. Local server microbenchmarks

Use the local benchmark harness for:

- Kita-aligned page-sized `renderToString(...)`
- hydrated server output `renderToString(..., { hydrate: true })`
- future string-render regressions in escaping and binding serialization

Both numbers are directly comparable across revisions of the Radiant server renderer.

Only the non-hydrate number should be compared with the published Kita methodology. The hydrate number is Radiant-specific because it measures extra SSR marker generation.

### 3. Local browser microbenchmarks

Measure these operations in Chromium with `performance.now()`:

- create 1,000 rows
- replace 1,000 rows
- update every 10th row
- swap two rows
- remove one row
- clear all rows

These should be treated as exploratory numbers only, not publishable benchmark results.

### 4. Full js-framework-benchmark integration

Use the official structure from `krausest/js-framework-benchmark`.

- Create a new implementation under `frameworks/non-keyed/ecopages-jsx` first.
- Match the exact table DOM structure and button ids from the benchmark reference implementation.
- Avoid Shadow DOM.
- Keep row selection as a single selected id in state.
- Do not add manual shortcuts that would make the implementation non-idiomatic.

`non-keyed` is the honest starting point for the current runtime.

If we later add keyed child reconciliation with stable node reuse, then we can evaluate whether a `keyed` implementation is justified.

## What To Improve Before Expecting Competitive Results

The biggest missing pieces are:

- stable child-part reuse across rerenders
- keyed list reconciliation
- attribute and text patching in place instead of subtree replacement
- template instance caching for repeated template shapes

Without those, the benchmark will mostly measure the cost of rebuilding DOM trees.
