import {
	CI_RETRY_GATE_EVIDENCE_SCHEMA,
	assertCiRetryGateEvidenceV1,
	validateCiRetryGateEvidenceV1,
} from "../../src/evidence/index.js";
import type { CiRetryGateEvidenceV1 } from "../../src/evidence/index.js";

function makeEvidence(): CiRetryGateEvidenceV1 {
	return {
		schemaVersion: CI_RETRY_GATE_EVIDENCE_SCHEMA,
		authority: "EVIDENCE_ONLY",
		subject: {
			repository: "example/project",
			workflowName: "CI",
			runId: 123456789,
			runAttempt: 1,
			headSha: "0123456789abcdef0123456789abcdef01234567",
		},
		framework: "vitest",
		observedAt: "2026-10-07T06:00:00Z",
		summary: {
			tests: 100,
			passed: 96,
			failed: 2,
			skipped: 2,
			flaky: 1,
			durationMs: 42000,
		},
		historicalSignals: {
			historyWindowRuns: 20,
			failRate: 0.08,
			flakyRate: 0.03,
			p95DurationMs: 800,
		},
		provenance: {
			sourceFormat: "CTRF",
			sourceRefs: ["artifact://ctrf-report/123456789"],
			producer: "test-evidence-engine",
			producerVersion: "fork-genesis",
			capturedAt: "2026-10-07T06:00:00Z",
		},
		quality: {
			level: "COMPLETE",
			reasons: [],
		},
	};
}

describe("CI Retry Gate evidence contract v1", () => {
	it("accepts a fully bound evidence-only envelope", () => {
		expect(validateCiRetryGateEvidenceV1(makeEvidence())).toBe(true);
	});

	it("allows explicit absence of historical rates without inventing evidence", () => {
		const evidence = makeEvidence();
		evidence.historicalSignals = {
			historyWindowRuns: 0,
			failRate: null,
			flakyRate: null,
			p95DurationMs: null,
		};
		evidence.quality = {
			level: "PARTIAL",
			reasons: ["No prior comparable workflow runs were available."],
		};

		expect(validateCiRetryGateEvidenceV1(evidence)).toBe(true);
	});

	it("rejects evidence that is not bound to a valid run attempt", () => {
		const evidence = makeEvidence();
		evidence.subject.runAttempt = 0;

		expect(validateCiRetryGateEvidenceV1(evidence)).toBe(false);
	});

	it("rejects an unbound or malformed commit identity", () => {
		const evidence = makeEvidence();
		evidence.subject.headSha = "main";

		expect(validateCiRetryGateEvidenceV1(evidence)).toBe(false);
	});

	it("rejects an authority-bearing envelope", () => {
		const evidence = makeEvidence() as unknown as Record<string, unknown>;
		evidence.authority = "ALLOW_RETRY";

		expect(validateCiRetryGateEvidenceV1(evidence)).toBe(false);
	});

	it("fails closed at the assertion boundary", () => {
		const evidence = makeEvidence();
		evidence.provenance.sourceRefs = [];

		expect(() => assertCiRetryGateEvidenceV1(evidence)).toThrow(TypeError);
	});
});
