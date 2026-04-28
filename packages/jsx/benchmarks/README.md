# JSX Benchmarking Notes

## Current Benchmark Harness

There is now a local server-render benchmark that aligns its default page shape with the shared `RealWorldPage` workload used by this repo.

Run it with:

```bash
cd packages/jsx
bun run bench:server
```

`bench:server` now runs the full local benchmark sequence in one go:

- Bun with Mitata's native view
- Node with Mitata's native view
- the Bun-vs-Node comparison summary

That gives you all three perspectives in one command for these two SSR tasks:

- `renderToString`
- `renderToString hydrate`

If you only want the explicit Bun-vs-Node comparison view, use:

```bash
cd packages/jsx
bun run bench:server:compare
```

Under the hood the comparer runs the same measurement script twice:

- once with Bun
- once with Node via `tsx`

That matters because the question we actually care about is per task: how does Bun compare with Node for the same `renderToString(...)` workload?

The compare command intentionally runs Mitata in quiet mode and suppresses the duplicated per-runtime preamble, so it prints the shared page-size note once and then a compact Bun-vs-Node summary table.

It now also keeps an individual runtime recap for both Bun and Node before the comparison table so you can inspect the latency spread instead of only the collapsed winner/loser view.

If you want the raw single-runtime numbers explicitly, use the focused commands:

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
- the same purchase-card tree shape used throughout this benchmark harness
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

The default server benchmark command is now a combined report.

Inside that combined run you get:

- Bun with Mitata's native single-runtime report
- Node with Mitata's native single-runtime report
- the optional cross-runtime entrypoint reshaped into two views:

- an individual recap for Bun and Node with `avg`, `min`, `p75`, `p99`, and `max`
- a compact Bun-vs-Node comparison table focused on `avg / p75`

Mitata emits nanosecond stats internally. The comparer prints those stats in microseconds per iteration so the numbers stay readable for page-sized SSR work.

Read the recap columns like this:

- `avg`: mean latency per iteration
- `min`: fastest observed iteration
- `p75`: 75th-percentile latency
- `p99`: 99th-percentile latency, useful for tail spikes
- `max`: slowest observed iteration

That keeps the native Mitata output visible for both runtimes while also preserving the direct Bun-vs-Node answer in the same default run.

## Example Output

Typical comparison output looks like this:

```text
RealWorldPage output size: 169.1 KiB
renderToString hydrate includes Radiant SSR markers — treat it as an internal regression signal, not a baseline-comparable number.

Individual runtime recap (µs per iteration)
bun 1.3.6
benchmark                  avg  min  p75  p99   max
-----------------------  -----  ---  ---  ---  ----
renderToString             516  492  503  621  1035
renderToString hydrate    2370 2241 2298 2710  4188

node v24.6.0
benchmark                  avg  min  p75  p99   max
-----------------------  -----  ---  ---  ---  ----
renderToString             603  580  590  702  1098
renderToString hydrate    2552 2431 2481 2890  4470

Comparison (avg / p75, in µs)
Lower avgUs is better.

benchmark                bun avg/p75  node avg/p75  delta
-----------------------  -----------  ------------  -----
renderToString              516 / 503      603 / 590  Bun 1.17x
renderToString hydrate    2370 / 2298    2552 / 2481  Bun 1.08x

Metric guide: avg is the mean per iteration, min/max are the fastest and slowest observed iterations,
p75 is the 75th-percentile latency, and p99 is the 99th-percentile tail latency.
```

Read it like this:

- `renderToString` is the comparable server-render result
- `renderToString hydrate` includes extra SSR marker output and is only meaningful as an internal regression signal
- the individual recap shows the distribution for each runtime run in microseconds per iteration
- `bun avg/p75` and `node avg/p75` show average and p75 latency in microseconds
- `delta` shows which runtime won and by what ratio
- `delta` tells you the relative speed gap for that exact task

## Current Rendering Behavior

The current client renderer performs its own incremental DOM updates.

- repeated renders of the same template shape reuse compiled template metadata
- live attribute and child parts are updated in place when the template shape is stable
- keyed child collections preserve DOM ownership by key during reordering
- indexed child collections preserve DOM ownership by slot position
- `hydrate(...)` restores bindings and reconstructs live range bookkeeping on top of existing SSR DOM

The relevant implementation is in [dom-render.ts](../dom-render.ts).

That means performance work is now mostly about improving hot paths and hydration
recovery costs rather than replacing the renderer architecture wholesale.

## Evidence In This Repo

The test [dom-render-reconciliation.test.tsx](../test/dom-render-reconciliation.test.tsx) covers:

- stable template-instance patching
- keyed child reordering with node preservation
- indexed list updates by position
- subscribable child patching without parent rerenders

Those are the current foundations to measure before pursuing larger benchmark changes.

## Recommended Benchmark Plan

### 1. Local correctness + shape checks

- Keep the reconciliation behavior test in place.
- Add follow-up tests for row selection, row removal, and row swap once a benchmark implementation exists.

### 2. Local server microbenchmarks

Use the local benchmark harness for:

- page-sized `renderToString(...)`
- hydrated server output `renderToString(..., { mode: 'hydrate'  })`
- future string-render regressions in escaping and binding serialization

Both numbers are directly comparable across revisions of the Radiant server renderer.

Only the non-hydrate number should be treated as the baseline SSR number. The hydrate number is Radiant-specific because it measures extra SSR marker generation.

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
