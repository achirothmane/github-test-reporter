# CTRF Evidence Adapter v1

The CTRF adapter is the first executable producer behind
`test-evidence-engine.ci-retry-gate.v1`.

## Boundary

The adapter accepts one current normalized CTRF report, an explicit array of
previous comparable CTRF reports, and external subject/provenance context. It
emits an evidence-only envelope and never retry authority.

Historical signals are computed from previous reports only; the current run
does not contribute to its own prior.

The v1 historical semantics are:

- `historyWindowRuns`: usable previous reports;
- `failRate`: final failed results divided by final test results;
- `flakyRate`: flaky tests divided by final test results;
- `p95DurationMs`: p95 of individual historical test durations.

When required history does not exist, the signal is `null`, not zero.

The adapter emits `PARTIAL` evidence when history is absent, malformed history
is ignored, history has no test observations, or current summary counts
contradict the test array. A structurally invalid current report is refused.

Later work will add deterministic test identity, persistent window semantics,
cross-producer contradiction handling, and CI Retry Gate report-only
integration.
