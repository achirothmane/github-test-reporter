# CI Retry Gate Evidence Contract v1

Schema identifier:

`test-evidence-engine.ci-retry-gate.v1`

## Purpose

This contract is the first explicit seam between Test Evidence Engine and
CI Retry Gate.

It carries test observations and historical reliability signals. It does not
carry retry permission.

## Required binding

Every envelope is bound to:

- repository;
- workflow name;
- GitHub workflow run ID;
- run attempt;
- head commit SHA;
- observation timestamp.

An envelope without those fields is not admissible.

## Evidence-only authority

The only allowed value is:

```json
{
  "authority": "EVIDENCE_ONLY"
}
```

Values such as `ALLOW`, `RETRY`, `SAFE_TO_RERUN`, or equivalent authority
claims are outside this producer's contract.

CI Retry Gate may consume this evidence together with its independent
classification, side-effect, attempt-cap, provenance, and state-binding checks.

## Historical signals

The v1 contract exposes a deliberately small set:

- number of comparable historical runs;
- fail rate;
- flaky rate;
- p95 test duration.

When the history needed for a signal is unavailable, the value is `null`.
It must not be silently replaced with `0`.

## Provenance

The producer records:

- source format;
- one or more source references;
- producer name and version;
- capture time.

Later versions may add content digests and stronger artifact identity. Those
will extend the provenance boundary rather than replace it.

## Quality

Quality is one of:

- `COMPLETE` — required evidence for the declared observation is available;
- `PARTIAL` — useful evidence exists, but an expected source or history slice
  is missing;
- `INSUFFICIENT` — the producer cannot support the intended observation.

Reasons are explicit strings so consumers can distinguish absence from a
measured zero.

## Compatibility

The v1 schema is versioned independently of the inherited CTRF schema.
CTRF is an input format. It is not the cross-product authority contract.
