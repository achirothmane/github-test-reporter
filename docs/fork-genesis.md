# Test Evidence Engine — Fork Genesis

## Mission

Test Evidence Engine turns raw test output and historical CI runs into
framework-agnostic, provenance-bound evidence that other systems can consume.

The first consumer is CI Retry Gate. It remains a separate product and retains
all retry authorization policy.

This repository does **not** answer:

> Should this workflow be rerun?

It answers narrower questions such as:

- what tests ran and what happened;
- what is known about prior comparable runs;
- which tests have failed or behaved flakily before;
- how strong and complete the available evidence is;
- exactly which repository, workflow, run attempt, and commit the evidence
  describes.

## Product boundary

The intended flow is:

```text
JUnit / CTRF / framework reporters
              ↓
        ingestion + normalization
              ↓
       provenance binding
              ↓
      historical observations
              ↓
 reliability signals + boundaries
              ↓
       evidence contract
              ↓
     CI Retry Gate / other consumers
```

Test Evidence Engine owns evidence production. CI Retry Gate owns retry policy
and action authority.

## Genesis invariants

1. Evidence is bound to an exact repository, workflow, run ID, run attempt, and
   head SHA.
2. Missing history is represented as missing history, not as a zero-risk claim.
3. Derived rates identify their historical observation window.
4. Provenance references remain attached to exported evidence.
5. Evidence quality is explicit: `COMPLETE`, `PARTIAL`, or
   `INSUFFICIENT`.
6. The exported CI Retry Gate contract has `authority: EVIDENCE_ONLY`.
7. No renderer, AI summary, report template, or notification integration may
   silently grant action authority.
8. New capabilities are admitted with their failure boundary and falsification
   tests, not only a happy path.

## Genesis scope

Fork Genesis deliberately does not rewrite the inherited reporter in one pass.

The first phase is:

- preserve inherited ingestion/history/reporting behavior;
- document upstream provenance and divergence policy;
- establish the evidence-vs-authority boundary;
- add the first executable consumer contract for CI Retry Gate;
- use the contract as the seam for later normalization and historical evidence
  work.

## Next engineering sequence

After this contract is merged, the preferred order is:

1. CTRF → evidence-envelope adapter;
2. JUnit → the same internal normalized representation;
3. deterministic test identity across runs;
4. historical observation store/window semantics;
5. evidence quality and contradiction rules;
6. CI Retry Gate consumer integration in report-only mode;
7. only then evaluate whether any historical signal should influence a
   production decision.

Commercial positioning comes later. The immediate goal is a reusable evidence
primitive that is useful across our own CI products first.
