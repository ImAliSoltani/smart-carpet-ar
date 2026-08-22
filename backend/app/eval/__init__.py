"""Measurement code for the evaluation chapter.

Everything here *measures* the shipped system; nothing here is part of it. The
rule the roadmap sets (§11) is that notebooks hold no logic — so the notebooks
in `notebooks/` import from this package and do nothing but call it and draw
the result. A number that only exists inside a notebook cell cannot be re-run
by a reader, and cannot be regression-tested.

The other rule these modules follow: **measure the production path.** Every
metric here drives the same function the API calls, with the same arguments,
rather than a re-implementation that agrees with it today. A benchmark that
re-implements the thing it benchmarks measures the benchmark.
"""
