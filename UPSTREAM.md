# Upstream provenance

Test Evidence Engine is being developed as a hard fork of
[ctrf-io/github-test-reporter](https://github.com/ctrf-io/github-test-reporter).

## Fork point

The fork was created from the upstream `main` line. The inherited codebase
remains under its original MIT license and copyright notice in `LICENSE`.

## What we intentionally inherit

The initial fork keeps the mature parts that are expensive and unnecessary to
rebuild:

- CTRF and JUnit ingestion;
- framework-agnostic test result handling;
- historical workflow-artifact retrieval;
- fail-rate, flaky-rate, duration, and previous-run metrics;
- GitHub Actions packaging;
- job-summary, check, annotation, issue, and pull-request presentation;
- existing tests, build tooling, and reporter templates.

## What is not automatically trusted

Inherited capability is not the same thing as admitted evidence.

The following upstream outputs are useful presentation or analysis surfaces, but
they do not become retry authority merely because they exist:

- AI summaries or recommendations;
- arbitrary templates;
- comments, Slack posts, Teams posts, or rendered markdown;
- a flaky label without subject and provenance binding;
- a historical rate without the observation window and source references;
- any metric whose required source data was unavailable.

## Divergence policy

We will not blindly merge upstream `main` after the fork starts to diverge.

Upstream changes are evaluated as candidate inputs. Security fixes, format
compatibility, framework support, and correctness fixes should usually be
cherry-picked or adapted. Product-policy or architectural changes are admitted
only when they preserve this fork's evidence boundary.

The rule is simple:

> Reuse upstream capability. Re-prove its boundary.
